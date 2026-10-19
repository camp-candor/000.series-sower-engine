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
} from './types.js'

export const LOADER_TAG = '[CANON::LOADER]' as const

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
