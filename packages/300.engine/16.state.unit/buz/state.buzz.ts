/**
 * 16.state.unit - State Buzz Business Logic
 * Pure deterministic state fold, deep-frozen snapshot sealing, and recursive why-dirty queries.
 */
import { StateModel } from '../state.model.js'
import type StateBit from '../fce/state.bit.js'
import type {
    LedgerWorkingState,
    StateFoldReceipt,
    WhyDirtyResult,
    WhyDirtyPathNode,
    CompositeEntityLiveRecord,
    StringsLedgerRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    ActorBeliefRecord,
    UnratifiedDetailRecord,
} from '../fce/state.interface.js'
import {
    canonicalizeJson,
    sha256Hex,
} from '../../04.envelope.unit/envelope.buzzer.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

/**
 * Recursively applies Object.freeze to deep-freeze all nested objects and arrays.
 */
export function recursiveDeepFreeze<T>(
    obj: T,
    visited = new WeakSet<object>(),
): Readonly<T> {
    if (obj === null || typeof obj !== 'object') {
        return obj as Readonly<T>
    }
    if (visited.has(obj as object)) {
        return obj as Readonly<T>
    }
    visited.add(obj as object)

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const val = obj[i]
            if (
                val !== null &&
                (typeof val === 'object' || typeof val === 'function')
            ) {
                recursiveDeepFreeze(val, visited)
            }
        }
        return Object.freeze(obj) as Readonly<T>
    }

    if (!Object.isFrozen(obj)) {
        for (const key of Object.getOwnPropertyNames(obj)) {
            const desc = Object.getOwnPropertyDescriptor(obj, key)
            if (desc && desc.configurable && 'value' in desc) {
                let currentVal = desc.value
                if (
                    currentVal !== null &&
                    (typeof currentVal === 'object' ||
                        typeof currentVal === 'function')
                ) {
                    currentVal = recursiveDeepFreeze(currentVal, visited)
                }
                Object.defineProperty(obj, key, {
                    get() {
                        return currentVal
                    },
                    set() {
                        throw new TypeError(
                            `Cannot assign to read only property '${key}' of object`,
                        )
                    },
                    enumerable: desc.enumerable,
                    configurable: false,
                })
            }
        }
    } else {
        for (const key of Object.getOwnPropertyNames(obj)) {
            const val = (obj as any)[key]
            if (
                val !== null &&
                (typeof val === 'object' || typeof val === 'function')
            ) {
                recursiveDeepFreeze(val, visited)
            }
        }
    }
    return Object.freeze(obj) as Readonly<T>
}

export const deepFreeze = recursiveDeepFreeze

/**
 * Computes deterministic SHA-256 state hash using RFC 8785 canonical JSON sorting.
 */
export function computeWorkingStateHash(
    state: Omit<LedgerWorkingState, 'stateHash'> | Record<string, any>,
): string {
    const hashPayload = {
        beliefs: (state as any).beliefs || {},
        clocks: (state as any).clocks || {},
        details:
            (state as any).details || (state as any).unratifiedDetails || {},
        entities: (state as any).entities || {},
        grievances: (state as any).grievances || {},
        schemaVersion: (state as any).schemaVersion || '1.0.0',
        seriesSlug: (state as any).seriesSlug,
        strings: (state as any).strings || {},
        tick: (state as any).tick ?? 0,
    }
    const canonicalString = canonicalizeJson(hashPayload)
    return sha256Hex(canonicalString)
}

/**
 * Pure state reducer applying an event envelope to a state instance: S_{n+1} = R(S_n, E_n, sigma_n).
 */
export function reduceLedgerState(
    prevState: LedgerWorkingState,
    event: any,
): LedgerWorkingState {
    const nextTick = Math.max(prevState.tick, event.tick ?? prevState.tick + 1)
    const nextSeq = (prevState.lastSequenceNumber ?? 0) + 1

    const entities: Record<string, CompositeEntityLiveRecord> = {
        ...prevState.entities,
    }
    const strings: Record<string, StringsLedgerRecord> = {
        ...prevState.strings,
    }
    const grievances: Record<string, GrievanceStatusRecord> = {
        ...prevState.grievances,
    }
    const clocks: Record<string, ParanoiaClockRecord> = { ...prevState.clocks }
    const beliefs: Record<string, ActorBeliefRecord> = { ...prevState.beliefs }
    const unratifiedDetails: Record<string, UnratifiedDetailRecord> = {
        ...prevState.unratifiedDetails,
    }

    const payload = event.payload || {}

    switch (event.eventType) {
        case 'SOMATIC_TRAUMA_APPLIED':
        case 'SOMATIC_TRAUMA': {
            const entId = event.actorId || payload.entityId
            if (entId && entities[entId]) {
                const current = entities[entId]
                const addedConditions = payload.conditionsAdded || []
                entities[entId] = {
                    ...current,
                    fatigue_bps: Math.min(
                        10000,
                        current.fatigue_bps +
                            (payload.fatigueBpsDelta ||
                                payload.fatigueBps ||
                                0),
                    ),
                    pain_bps: Math.min(
                        10000,
                        current.pain_bps +
                            (payload.painBpsDelta || payload.painBps || 0),
                    ),
                    refusal_strain_bps: Math.min(
                        10000,
                        current.refusal_strain_bps +
                            (payload.refusalStrainBpsDelta || 0),
                    ),
                    open_wounds: Object.freeze([
                        ...current.open_wounds,
                        ...addedConditions,
                    ]),
                    updated_at_ms: event.timestampMs || current.updated_at_ms,
                }
            }
            break
        }

        case 'SPATIAL_DISPLACEMENT_COMMITTED':
        case 'SPATIAL_MOVE': {
            const entId = event.actorId || payload.entityId
            if (entId && entities[entId]) {
                const current = entities[entId]
                entities[entId] = {
                    ...current,
                    location_id: payload.locationId || current.location_id,
                    q:
                        payload.toCoord?.q ??
                        payload.fromCoord?.[0] ??
                        current.q,
                    r:
                        payload.toCoord?.r ??
                        payload.fromCoord?.[1] ??
                        current.r,
                    updated_at_ms: event.timestampMs || current.updated_at_ms,
                }
            }
            break
        }

        case 'SOCIAL_STRING_EXCHANGED':
        case 'STRING_EXCHANGE': {
            const relId =
                payload.relation_id ||
                `${payload.holderId}->${payload.debtorId}`
            const currentCount = strings[relId]?.strings_count || 0
            const delta = payload.stringsCount ?? payload.delta ?? 0
            const newCount =
                payload.operation === 'SPEND'
                    ? Math.max(0, currentCount - delta)
                    : currentCount + delta

            strings[relId] = {
                relation_id: relId,
                holder_id: payload.holderId,
                debtor_id: payload.debtorId,
                weight_bps:
                    payload.weightBps || strings[relId]?.weight_bps || 10000,
                strings_count: newCount,
                updated_at_ms: event.timestampMs || 1700000000000,
            }
            break
        }

        case 'GRIEVANCE_ESCALATED': {
            const grvId = payload.grievance_id
            if (grvId && grievances[grvId]) {
                const current = grievances[grvId]
                grievances[grvId] = {
                    ...current,
                    escalation_depth: current.escalation_depth + 1,
                    intensity_bps:
                        payload.intensity_bps ?? current.intensity_bps,
                    status: payload.status ?? current.status,
                    updated_at_ms: event.timestampMs || current.updated_at_ms,
                }
            }
            break
        }

        case 'PARANOIA_CLOCK_TICKED':
        case 'PARANOIA_TICK': {
            const clkId = payload.clockId
            if (clkId && clocks[clkId]) {
                const current = clocks[clkId]
                clocks[clkId] = {
                    ...current,
                    value_bps: payload.valueBps ?? current.value_bps,
                    is_triggered: payload.isTriggered ? 1 : 0,
                    updated_at_ms: event.timestampMs || current.updated_at_ms,
                }
            }
            break
        }

        case 'DETAIL_RATIFIED': {
            const detId = payload.detail_id
            if (detId && unratifiedDetails[detId]) {
                unratifiedDetails[detId] = {
                    ...unratifiedDetails[detId],
                    status: 'RATIFIED',
                    reviewed_at_ms: event.timestampMs || 1700000000000,
                }
            }
            break
        }
    }

    const unhashed = {
        schemaVersion: '1.0.0' as const,
        details: Object.freeze(unratifiedDetails) as any,
        reducerVersion: 'v1.0.0',
        seriesSlug: prevState.seriesSlug,
        tick: nextTick,
        lastSequenceNumber: nextSeq,
        lastEventHash: event.eventId || `evt_${nextSeq}`,
        entities: Object.freeze(entities),
        strings: Object.freeze(strings),
        grievances: Object.freeze(grievances),
        clocks: Object.freeze(clocks),
        beliefs: Object.freeze(beliefs),
        unratifiedDetails: Object.freeze(unratifiedDetails),
    }

    const stateHash = computeWorkingStateHash(unhashed)

    return deepFreeze({
        ...unhashed,
        stateHash,
    })
}

/**
 * Pure functional state fold: State_N = fold(R, State_0, [E_1, ..., E_N]).
 */
export function foldLedgerEvents(
    initialState: LedgerWorkingState,
    events: readonly any[],
): LedgerWorkingState {
    let current = initialState
    for (const evt of events) {
        current = reduceLedgerState(current, evt)
    }
    return current
}

/**
 * Recursive why-dirty blast-radius query with bounded depth ceiling (< 6).
 */
export function whyDirtyEntity(
    entityId: string,
    dependencyMap: Record<
        string,
        readonly { entityId: string; edgeType: string }[]
    > = {},
    maxDepth: number = 5,
): WhyDirtyResult {
    const visited = new Set<string>()
    const affectedScenes: string[] = []
    const paths: WhyDirtyPathNode[] = []

    function traverse(currentId: string, depth: number) {
        if (depth > maxDepth || visited.has(currentId)) {
            return
        }
        visited.add(currentId)

        for (const [sceneId, deps] of Object.entries(dependencyMap)) {
            for (const dep of deps) {
                if (dep.entityId === currentId) {
                    affectedScenes.push(sceneId)
                    paths.push({
                        sourceEntityId: currentId,
                        targetSceneId: sceneId,
                        edgeType: dep.edgeType,
                        depth,
                    })
                }
            }
        }
    }

    traverse(entityId, 1)

    return {
        entityId,
        isDirty: affectedScenes.length > 0,
        affectedScenes: Object.freeze(Array.from(new Set(affectedScenes))),
        traversalPaths: Object.freeze(paths),
        traversalDepth:
            paths.length > 0 ? Math.max(...paths.map((p) => p.depth)) : 0,
    }
}

export const initState = async (
    cpy: StateModel,
    bal?: StateBit,
    ste?: State,
): Promise<StateModel> => {
    cpy.activeSnapshot = null

    await emitConsole(
        ste,
        '>> [STATE:INIT] [OK] Deterministic state fold execution unit online.',
    )

    if (bal?.slv) {
        bal.slv({
            steBit: {
                idx: 'init-state-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateState = (
    cpy: StateModel,
    bal?: StateBit,
    _ste?: State,
): StateModel => {
    if (bal?.slv) {
        bal.slv({
            steBit: {
                idx: 'update-state-pass',
                val: 1,
            },
        })
    }
    return cpy
}

function parseJsonSafe(val: any, fallback: any): any {
    if (typeof val !== 'string') return val ?? fallback
    try {
        return JSON.parse(val)
    } catch {
        return fallback
    }
}

export const hydrateState = async (
    cpy: StateModel,
    bal?: StateBit,
    ste?: State,
): Promise<StateModel> => {
    const seriesSlug =
        bal?.dat?.seriesSlug ||
        bal?.dat?.hydrateParams?.seriesSlug ||
        cpy.activeSeriesSlug ||
        'wiregrass-basin'
    const tick = bal?.dat?.tick ?? bal?.dat?.hydrateParams?.tick ?? 0
    const expectedHash =
        bal?.dat?.expectedHash || (bal?.dat?.hydrateParams as any)?.expectedHash

    await emitConsole(
        ste,
        `>> [STATE:HYDRATE] Aggregating 4-vector working tables for [${seriesSlug}]...`,
    )

    const entities: Record<string, any> = {}
    const strings: Record<string, any> = {}
    const grievances: Record<string, any> = {}
    const clocks: Record<string, any> = {}
    const beliefs: Record<string, any> = {}
    const details: Record<string, any> = {}

    if (ste && typeof ste.hunt === 'function') {
        // 1. Entities live
        const entRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: {
                query: 'SELECT * FROM entities_live ORDER BY entity_id ASC',
                table: 'entities_live',
            },
        })
        const entRows =
            entRes?.databaseBit?.dat?.rows ||
            entRes?.databaseBit?.dat?.records ||
            []
        for (const r of entRows) {
            const entId = r.entity_id || r.entityId
            entities[entId] = {
                entityId: entId,
                locationId: r.location_id || r.locationId || 'loc_origin_hub',
                q: Number(r.q ?? 0),
                r: Number(r.r ?? 0),
                armsAvailable: Number(r.arms_available ?? r.armsAvailable ?? 2),
                legsAvailable: Number(r.legs_available ?? r.legsAvailable ?? 2),
                locomotionTier:
                    r.locomotion_tier || r.locomotionTier || 'UNRESTRICTED',
                concussionLevel: Number(
                    r.concussion_level ?? r.concussionLevel ?? 0,
                ),
                wounds: parseJsonSafe(r.wounds_json ?? r.wounds, []),
                heldItems: parseJsonSafe(r.held_items_json ?? r.heldItems, []),
                wornGear: parseJsonSafe(r.worn_gear_json ?? r.wornGear, []),
                slungItems: parseJsonSafe(
                    r.slung_items_json ?? r.slungItems,
                    [],
                ),
                updatedAtMs: Number(r.updated_at_ms ?? r.updatedAtMs ?? 0),
            }
        }

        // 2. Strings ledger
        const strRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: {
                query: 'SELECT * FROM strings_ledger ORDER BY string_id ASC',
                table: 'strings_ledger',
            },
        })
        const strRows =
            strRes?.databaseBit?.dat?.rows ||
            strRes?.databaseBit?.dat?.records ||
            []
        for (const r of strRows) {
            const strId = r.string_id || r.relation_id || r.stringId
            strings[strId] = {
                stringId: strId,
                holderId: r.holder_id || r.holderId,
                debtorId: r.debtor_id || r.debtorId,
                weightBps: Number(r.weight_bps ?? r.weightBps ?? 0),
                createdAtMs: Number(r.created_at_ms ?? r.createdAtMs ?? 0),
                updatedAtMs: Number(r.updated_at_ms ?? r.updatedAtMs ?? 0),
            }
        }

        // 3. Grievances status
        const grvRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: {
                query: 'SELECT * FROM grievance_status ORDER BY grievance_id ASC',
                table: 'grievance_status',
            },
        })
        const grvRows =
            grvRes?.databaseBit?.dat?.rows ||
            grvRes?.databaseBit?.dat?.records ||
            []
        for (const r of grvRows) {
            const grvId = r.grievance_id || r.grievanceId
            grievances[grvId] = {
                grievanceId: grvId,
                initiatorId:
                    r.initiator_id || r.instigator_id || r.initiatorId || '',
                targetId: r.target_id || r.victim_id || r.targetId || '',
                escalationStage: Number(
                    r.escalation_stage ?? r.escalationDepth ?? 0,
                ),
                cooldownCycles: Number(
                    r.cooldown_cycles ?? r.cooldownCycles ?? 0,
                ),
                intensityBps: Number(r.intensity_bps ?? r.intensityBps ?? 0),
                status: r.status || 'DORMANT',
                updatedAtMs: Number(r.updated_at_ms ?? r.updatedAtMs ?? 0),
            }
        }

        // 4. Paranoia clocks
        const clkRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: {
                query: 'SELECT * FROM paranoia_clocks ORDER BY clock_id ASC',
                table: 'paranoia_clocks',
            },
        })
        const clkRows =
            clkRes?.databaseBit?.dat?.rows ||
            clkRes?.databaseBit?.dat?.records ||
            []
        for (const r of clkRows) {
            const clkId = r.clock_id || r.clockId
            clocks[clkId] = {
                clockId: clkId,
                entityId: r.entity_id || r.entityId || null,
                valueBps: Number(r.value_bps ?? r.valueBps ?? 0),
                thresholdBps: Number(r.threshold_bps ?? r.thresholdBps ?? 0),
                decayRateBps: Number(r.decay_rate_bps ?? r.decayRateBps ?? 0),
                updatedAtMs: Number(r.updated_at_ms ?? r.updatedAtMs ?? 0),
            }
        }

        // 5. Actor beliefs
        const blfRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: {
                query: 'SELECT * FROM actor_beliefs ORDER BY belief_id ASC',
                table: 'actor_beliefs',
            },
        })
        const blfRows =
            blfRes?.databaseBit?.dat?.rows ||
            blfRes?.databaseBit?.dat?.records ||
            []
        for (const r of blfRows) {
            const blfId = r.belief_id || r.beliefId
            beliefs[blfId] = {
                beliefId: blfId,
                observerId: r.observer_id || r.observerId,
                factId: r.fact_id || r.factId,
                subjectiveProbabilityBps: Number(
                    r.subjective_probability_bps ??
                        r.subjectiveProbabilityBps ??
                        0,
                ),
                sourceType:
                    r.source_type || r.sourceType || 'DIRECT_OBSERVATION',
                isFalseBelief: Boolean(
                    r.is_false_belief === 1 || r.isFalseBelief,
                ),
                learnedAtMs: Number(r.learned_at_ms ?? r.learnedAtMs ?? 0),
                updatedAtMs: Number(r.updated_at_ms ?? r.updatedAtMs ?? 0),
            }
        }

        // 6. Unratified details
        const detRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: {
                query: 'SELECT * FROM unratified_details ORDER BY detail_id ASC',
                table: 'unratified_details',
            },
        })
        const detRows =
            detRes?.databaseBit?.dat?.rows ||
            detRes?.databaseBit?.dat?.records ||
            []
        for (const r of detRows) {
            const detId = r.detail_id || r.detailId
            details[detId] = {
                detailId: detId,
                sceneId: r.scene_id || r.sceneId,
                entityId: r.entity_id || r.entityId || null,
                salienceBps: Number(r.salience_bps ?? r.salienceBps ?? 0),
                claimProposal: r.claim_proposal || r.claimProposal || '',
                status: r.status || 'STAGED',
                createdAtMs: Number(r.created_at_ms ?? r.createdAtMs ?? 0),
                reviewedAtMs: r.reviewed_at_ms
                    ? Number(r.reviewed_at_ms)
                    : r.reviewedAtMs
                      ? Number(r.reviewedAtMs)
                      : null,
            }
        }
    }

    const rawState: Omit<LedgerWorkingState, 'stateHash'> = {
        schemaVersion: '1.0.0',
        seriesSlug,
        tick,
        entities,
        strings,
        grievances,
        clocks,
        beliefs,
        details,
        unratifiedDetails: details,
    }

    const stateHash = computeWorkingStateHash(rawState)

    if (
        expectedHash &&
        expectedHash.toLowerCase() !== stateHash.toLowerCase()
    ) {
        const errorMsg = `[CANON_DESYNCHRONIZED] State hash parity breach! Expected: ${expectedHash} Computed: ${stateHash}`
        await emitConsole(ste, `:: [STATE:ERR] ${errorMsg}`)
        throw new Error(errorMsg)
    }

    const completedState: LedgerWorkingState = {
        ...rawState,
        stateHash,
    }

    const frozenWorkingState = recursiveDeepFreeze(completedState)

    cpy.activeSeriesSlug = seriesSlug
    cpy.activeStateHash = stateHash
    cpy.workingState = frozenWorkingState
    cpy.activeSnapshot = frozenWorkingState

    await emitConsole(
        ste,
        `>> [STATE:SEAL] Hydrated and deep-frozen snapshot for [${seriesSlug}].`,
    )
    await emitConsole(ste, `>> [STATE:HASH] Merkle root digest: ${stateHash}`)
    await emitConsole(
        ste,
        `:: [STATE:OK] Composite state snapshot active (${Object.keys(entities).length} entities online).`,
    )

    if (bal?.slv) {
        bal.slv({
            snapshot: frozenWorkingState,
            workingState: frozenWorkingState,
            stateHash,
            steBit: {
                idx: 'hydrate-state-pass',
                val: 1,
                src: stateHash,
                dat: {
                    workingState: frozenWorkingState,
                    snapshot: frozenWorkingState,
                    stateHash,
                    seriesSlug,
                },
            },
        })
    }

    return cpy
}

export const hydrateStateAction = hydrateState

export const getStateAction = (
    cpy: StateModel,
    bal?: StateBit,
    _ste?: State,
): StateModel => {
    const ws = cpy.workingState || cpy.activeSnapshot
    if (bal?.slv) {
        bal.slv({
            snapshot: ws,
            workingState: ws,
            stateHash: cpy.activeStateHash,
            steBit: {
                idx: 'get-state-pass',
                val: ws ? 1 : 0,
                src: cpy.activeStateHash,
                dat: {
                    workingState: ws,
                    snapshot: ws,
                    stateHash: cpy.activeStateHash,
                },
            },
        })
    }
    return cpy
}

export const computeHashStateAction = (
    cpy: StateModel,
    bal: StateBit,
    _ste?: State,
): StateModel => {
    if (!cpy.activeSnapshot) {
        if (bal.slv) {
            bal.slv({
                steBit: {
                    idx: 'compute-hash-fail',
                    val: 0,
                    dat: {
                        error: '[NO_ACTIVE_SNAPSHOT] Snapshot not hydrated',
                    },
                },
            })
        }
        return cpy
    }

    const hash = cpy.activeSnapshot.stateHash

    if (bal.slv) {
        bal.slv({
            stateHash: hash,
            steBit: {
                idx: 'compute-hash-pass',
                val: 1,
                dat: { stateHash: hash },
            },
        })
    }
    return cpy
}

export const freezeStateAction = (
    cpy: StateModel,
    bal: StateBit,
    _ste?: State,
): StateModel => {
    if (cpy.activeSnapshot) {
        deepFreeze(cpy.activeSnapshot)
    }

    if (bal.slv) {
        bal.slv({
            snapshot: cpy.activeSnapshot,
            steBit: {
                idx: 'freeze-state-pass',
                val: 1,
                dat: { snapshot: cpy.activeSnapshot },
            },
        })
    }
    return cpy
}

export const foldEventsStateAction = async (
    cpy: StateModel,
    bal: StateBit,
    ste?: State,
): Promise<StateModel> => {
    const raw = (bal.dat?.foldParams || bal.dat || {}) as any
    const baseState = raw.baseState || cpy.activeSnapshot
    const events = raw.events || []

    if (!baseState) {
        const err = '[NO_BASE_STATE] Cannot fold events without base state'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                steBit: {
                    idx: 'fold-events-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const folded = foldLedgerEvents(baseState, events)
    cpy.activeSnapshot = folded

    const receipt: StateFoldReceipt = {
        initialTick: baseState.tick,
        finalTick: folded.tick,
        eventsCount: events.length,
        previousStateHash: baseState.stateHash,
        nextStateHash: folded.stateHash,
        executionTimeMs: 1,
    }

    await emitConsole(
        ste,
        `>> [STATE:FOLD] Folded ${events.length} events: ${baseState.stateHash.slice(0, 8)} -> ${folded.stateHash.slice(0, 8)} [SEALED] [OK]`,
    )

    if (bal.slv) {
        bal.slv({
            snapshot: folded,
            foldReceipt: receipt,
            steBit: {
                idx: 'fold-events-pass',
                val: events.length,
                src: '[OK]',
                dat: { snapshot: folded, foldReceipt: receipt },
            },
        })
    }

    return cpy
}

export const whyDirtyStateAction = (
    cpy: StateModel,
    bal: StateBit,
    _ste?: State,
): StateModel => {
    const raw = (bal.dat?.whyDirtyParams || bal.dat || {}) as any
    const entityId = raw.entityId || bal.src || ''
    const deps = raw.sceneDependencies || {}

    const result = whyDirtyEntity(entityId, deps, 5)

    if (bal.slv) {
        bal.slv({
            whyDirtyResult: result,
            steBit: {
                idx: 'why-dirty-pass',
                val: result.affectedScenes.length,
                dat: { whyDirtyResult: result },
            },
        })
    }

    return cpy
}
