import * as crypto from 'node:crypto'
import { BibleStateSchema } from './types.js'
import type {
    BibleLoaderOptions,
    BibleState,
    CanonCheckpointVerificationResult,
    DeepReadonly,
    DualRailCharacter,
    ICanonCheckpointPort,
    SealedBibleState,
    EntityDependencyNode,
    DependencyFingerprint,
    AdvisoryRebaseResult,
} from './types.js'

export const LOADER_TAG = '[CANON::LOADER]' as const
export const HDEP_TAG = '[CANON::HDEP]' as const

export class CanonDriftError extends Error {
    constructor(message: string) {
        super(`${LOADER_TAG} [FAIL] CANON_DRIFT_ERROR: ${message}`)
        this.name = 'CanonDriftError'
    }
}

export class CanonValidationError extends Error {
    constructor(message: string) {
        super(`${LOADER_TAG} [FAIL] CANON_VALIDATION_ERROR: ${message}`)
        this.name = 'CanonValidationError'
    }
}

export class CanonDesynchronizedError extends Error {
    public readonly code = 'CANON_STALE' as const
    public readonly isDirty: boolean
    public readonly snapshotHash: string
    public readonly ledgerHash?: string

    constructor(
        message: string,
        details: {
            snapshotHash: string
            ledgerHash?: string
            isDirty?: boolean
        },
    ) {
        super(`${LOADER_TAG} [FAIL] [CANON_STALE] ${message}`)
        this.name = 'CanonDesynchronizedError'
        this.snapshotHash = details.snapshotHash
        this.ledgerHash = details.ledgerHash
        this.isDirty = details.isDirty ?? true
    }
}

export function rfc8785Canonicalize(val: unknown): string {
    if (val === null || typeof val !== 'object') {
        return JSON.stringify(val) as string
    }

    if (Array.isArray(val)) {
        const elements = val.map((item) => rfc8785Canonicalize(item))
        return `[${elements.join(',')}]`
    }

    const record = val as Record<string, unknown>
    const sortedKeys = Object.keys(record).sort((a, b) => {
        return a < b ? -1 : a > b ? 1 : 0
    })

    const members = sortedKeys
        .filter((k) => record[k] !== undefined)
        .map((k) => `${JSON.stringify(k)}:${rfc8785Canonicalize(record[k])}`)

    return `{${members.join(',')}}`
}

export function computeSha256(canonicalPayload: string): string {
    return crypto
        .createHash('sha256')
        .update(canonicalPayload, 'utf8')
        .digest('hex')
}

export function computeEntityContentHash(entity: unknown): string {
    return computeSha256(rfc8785Canonicalize(entity))
}

export function compute1HopDependencyHash(
    targetHash: string,
    foreignKeyHashes: readonly string[],
): string {
    const combined = [targetHash, ...foreignKeyHashes].sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )
    return computeSha256(rfc8785Canonicalize(combined))
}

export function deepFreeze<T>(obj: T): DeepReadonly<T> {
    if (obj === null || typeof obj !== 'object') {
        return obj as DeepReadonly<T>
    }

    const propNames = Object.getOwnPropertyNames(obj)
    for (const name of propNames) {
        const value = (obj as Record<string, unknown>)[name]
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value)
        }
    }

    return Object.freeze(obj) as DeepReadonly<T>
}

/**
 * Tier 2: Multi-Hop Transitive Dependency Closure Precomputer (H_dep_transitive)
 * Recursively walks the dependency DAG, prevents cyclical lockups,
 * and hashes the canonical sorted set of all reachable upstream nodes.
 */
export function computeTransitiveDependencyClosure(
    targetId: string,
    dependencyGraph: Record<string, EntityDependencyNode>,
): { transitiveHash: string; transitiveFkIds: readonly string[] } {
    const targetNode = dependencyGraph[targetId]
    if (!targetNode) {
        throw new CanonValidationError(
            `Entity [${targetId}] not found in dependency graph.`,
        )
    }

    const visitedFkIds = new Set<string>()
    const ancestorHashes: string[] = [targetNode.contentHash]

    function walk(currentId: string) {
        const node = dependencyGraph[currentId]
        if (!node) return

        for (const fkId of node.directFkIds) {
            // Root-excluded closure (ag-test 016 L3.2, authoritative over the
            // original 015 reference walk): a node is not its own dependency,
            // so a cycle back-edge to targetId contributes neither an fkId
            // nor a duplicate copy of the target content hash.
            if (fkId === targetId) continue
            if (!visitedFkIds.has(fkId)) {
                visitedFkIds.add(fkId)
                const fkNode = dependencyGraph[fkId]
                if (fkNode) {
                    ancestorHashes.push(fkNode.contentHash)
                    walk(fkId)
                }
            }
        }
    }

    walk(targetId)

    // Deterministically sort hashes lexicographically by UTF-16 code units (RFC 8785)
    const sortedHashes = [...ancestorHashes].sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )
    const sortedFkIds = Array.from(visitedFkIds).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )

    return {
        transitiveHash: computeSha256(rfc8785Canonicalize(sortedHashes)),
        transitiveFkIds: sortedFkIds,
    }
}

/**
 * Extracts normalized dependency nodes across all entities in a BibleState
 */
export function extractDependencyGraph(
    bibleState: BibleState | SealedBibleState,
): Record<string, EntityDependencyNode> {
    const raw = 'rawState' in bibleState ? bibleState.rawState : bibleState
    const graph: Record<string, EntityDependencyNode> = {}

    // Characters -> equip items, locations, faction
    for (const [id, char] of Object.entries(raw.characters)) {
        const fks = new Set<string>()
        char.logistical.held.forEach((item) => fks.add(item))
        Object.values(char.logistical.worn).forEach((item) => fks.add(item))
        char.logistical.slung.forEach((item) => fks.add(item))

        graph[id] = {
            id,
            type: 'character',
            contentHash: computeEntityContentHash(char),
            directFkIds: Array.from(fks).sort((a, b) =>
                a < b ? -1 : a > b ? 1 : 0,
            ),
        }
    }

    // Locations -> portals
    for (const [id, loc] of Object.entries(raw.locations)) {
        graph[id] = {
            id,
            type: 'location',
            contentHash: computeEntityContentHash(loc),
            directFkIds: [...loc.portals].sort((a, b) =>
                a < b ? -1 : a > b ? 1 : 0,
            ),
        }
    }

    // Possessions -> holder character
    for (const [id, item] of Object.entries(raw.possessions)) {
        const fks: string[] = []
        if (item.holderId) fks.push(item.holderId)

        graph[id] = {
            id,
            type: 'possession',
            contentHash: computeEntityContentHash(item),
            directFkIds: fks,
        }
    }

    // Grievances -> disputant characters, escalated grievance
    for (const [id, grv] of Object.entries(raw.grievances)) {
        const fks = new Set<string>([grv.sourceActorId, grv.targetActorId])
        if (grv.escalatesToId) fks.add(grv.escalatesToId)

        graph[id] = {
            id,
            type: 'grievance',
            contentHash: computeEntityContentHash(grv),
            directFkIds: Array.from(fks).sort((a, b) =>
                a < b ? -1 : a > b ? 1 : 0,
            ),
        }
    }

    return graph
}

/**
 * Computes full two-tier fingerprints (1-Hop + Transitive Closure) for every entity in a BibleState
 */
export function buildTwoTierDependencyFingerprints(
    bibleState: BibleState | SealedBibleState,
): Record<string, DependencyFingerprint> {
    const graph = extractDependencyGraph(bibleState)
    const fingerprints: Record<string, DependencyFingerprint> = {}

    for (const [id, node] of Object.entries(graph)) {
        const fkHashes = node.directFkIds
            .map((fkId) => graph[fkId]?.contentHash)
            .filter((h): h is string => Boolean(h))

        const oneHopHash = compute1HopDependencyHash(node.contentHash, fkHashes)
        const closure = computeTransitiveDependencyClosure(id, graph)

        fingerprints[id] = {
            entityId: id,
            contentHash: node.contentHash,
            oneHopHash,
            transitiveHash: closure.transitiveHash,
            directFkIds: node.directFkIds,
            transitiveFkIds: closure.transitiveFkIds,
        }
    }

    return fingerprints
}

/**
 * Non-blocking 1-Hop Advisory Comparison Engine
 * Compares cached 1-hop hash against active 1-hop hash to generate UI rebase guidance.
 */
export function compareOneHopAdvisory(
    entityId: string,
    previousOneHopHash: string,
    currentOneHopHash: string,
    changedFkIds: readonly string[] = [],
): AdvisoryRebaseResult {
    const requiresRebase =
        previousOneHopHash.toLowerCase() !== currentOneHopHash.toLowerCase()

    const advisoryMessage = requiresRebase
        ? `${HDEP_TAG} [ADVISORY] Upstream canon modified for [${entityId}]. Direct foreign keys changed: [${changedFkIds.join(', ') || 'DIRECT_LINK'}]. Click Rebase to synchronize draft.`
        : `${HDEP_TAG} [OK] 1-hop dependency hash aligned for [${entityId}]. No draft rebase required.`

    return {
        requiresRebase,
        entityId,
        previousOneHopHash: previousOneHopHash.toLowerCase(),
        currentOneHopHash: currentOneHopHash.toLowerCase(),
        changedFkIds,
        advisoryMessage,
    }
}

export function extractDualRailCharacters(
    characters: Record<string, BibleState['characters'][string]>,
): Record<string, DualRailCharacter> {
    const result: Record<string, DualRailCharacter> = {}

    for (const [id, char] of Object.entries(characters)) {
        result[id] = {
            id: char.id,
            machine: {
                id: char.id,
                name: char.name,
                scope: char.scope,
                version: char.version,
                factionId: char.factionId,
                somatic: char.somatic,
                logistical: char.logistical,
            },
            voice: {
                surfaceArgument: char.voice.surfaceArgument,
                theUnderneath: char.voice.theUnderneath,
                refusalVectors: char.voice.refusalVectors,
                callbackPhrases: char.voice.callbackPhrases,
                centralIrony: char.voice.centralIrony,
            },
        }
    }

    return result
}

/**
 * Validates the cryptographic Merkle root (H_root) of a loaded BibleState against an
 * active checkpoint target. Accepts either a static hex string or an ICanonCheckpointPort.
 *
 * If hashes diverge or the checkpoint records isDirty === true, throws CanonDesynchronizedError ([CANON_STALE]).
 */
export async function verifyCanonCheckpoint(
    bibleState: SealedBibleState | BibleState,
    target: string | ICanonCheckpointPort,
): Promise<CanonCheckpointVerificationResult> {
    const seriesSlug =
        '_meta' in bibleState
            ? bibleState._meta.seriesSlug
            : bibleState.meta.seriesSlug
    const snapshotStateHash = (
        '_meta' in bibleState
            ? bibleState._meta.state_hash
            : bibleState.meta.state_hash
    ).toLowerCase()

    if (!/^[a-f0-9]{64}$/.test(snapshotStateHash)) {
        throw new CanonValidationError(
            `Invalid H_root format in snapshot: [${snapshotStateHash}]. Must be 64-character lowercase hexadecimal.`,
        )
    }

    let ledgerCheckpointHash: string
    let isDirty = false

    if (typeof target === 'string') {
        ledgerCheckpointHash = target.trim().toLowerCase()
    } else {
        const record = await target.getActiveCheckpoint(seriesSlug)
        if (!record) {
            throw new CanonDesynchronizedError(
                `No active ledger checkpoint registered for series slug: [${seriesSlug}]`,
                { snapshotHash: snapshotStateHash, isDirty: true },
            )
        }
        ledgerCheckpointHash = record.stateHash.trim().toLowerCase()
        isDirty = record.isDirty
    }

    if (!/^[a-f0-9]{64}$/.test(ledgerCheckpointHash)) {
        throw new CanonValidationError(
            `Invalid checkpoint hash format: [${ledgerCheckpointHash}]. Must be 64-character lowercase hexadecimal.`,
        )
    }

    if (isDirty) {
        throw new CanonDesynchronizedError(
            `Ledger checkpoint for series [${seriesSlug}] is flagged DIRTY (is_dirty = 1). Invalidation sweep required.`,
            {
                snapshotHash: snapshotStateHash,
                ledgerHash: ledgerCheckpointHash,
                isDirty: true,
            },
        )
    }

    if (snapshotStateHash !== ledgerCheckpointHash) {
        throw new CanonDesynchronizedError(
            `Cryptographic H_root mismatch! Snapshot H_root [${snapshotStateHash}] !== Ledger Checkpoint [${ledgerCheckpointHash}].`,
            {
                snapshotHash: snapshotStateHash,
                ledgerHash: ledgerCheckpointHash,
                isDirty: true,
            },
        )
    }

    return {
        valid: true,
        seriesSlug,
        snapshotStateHash,
        ledgerCheckpointHash,
        isDirty: false,
        verifiedAtIso: new Date().toISOString(),
    }
}

export function loadBibleState(
    rawPayload: unknown,
    options: BibleLoaderOptions = {},
): SealedBibleState {
    const parseResult = BibleStateSchema.safeParse(rawPayload)
    if (!parseResult.success) {
        throw new CanonValidationError(parseResult.error.message)
    }

    const state = parseResult.data
    const canonicalForm = rfc8785Canonicalize({
        characters: state.characters,
        locations: state.locations,
        possessions: state.possessions,
        grievances: state.grievances,
    })

    const computedStateHash = computeSha256(canonicalForm)

    if (!options.skipHashVerification) {
        const expected = options.expectedRootHash || state._meta.state_hash
        if (expected.toLowerCase() !== state._meta.state_hash.toLowerCase()) {
            throw new CanonDriftError(
                `Payload state_hash mismatch. Embedded: [${state._meta.state_hash}], Expected: [${expected}]`,
            )
        }

        if (computedStateHash !== state._meta.state_hash.toLowerCase()) {
            throw new CanonDriftError(
                `Cryptographic integrity breach: Computed H_root [${computedStateHash}] diverges from declared [${state._meta.state_hash}]`,
            )
        }
    }

    const dualRailChars = extractDualRailCharacters(state.characters)

    const sealedState: SealedBibleState = {
        meta: deepFreeze(state._meta),
        characters: deepFreeze(dualRailChars),
        locations: deepFreeze(state.locations),
        possessions: deepFreeze(state.possessions),
        grievances: deepFreeze(state.grievances),
        rawState: deepFreeze(state),
    }

    return deepFreeze(sealedState) as unknown as SealedBibleState
}
