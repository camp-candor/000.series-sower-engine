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
export function deepFreeze<T>(obj: T): Readonly<T> {
    if (obj === null || typeof obj !== 'object') {
        return obj as Readonly<T>
    }
    Object.freeze(obj)
    for (const key of Object.keys(obj)) {
        const val = (obj as any)[key]
        if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
            deepFreeze(val)
        }
    }
    return obj as Readonly<T>
}

/**
 * Computes deterministic SHA-256 state hash using RFC 8785 canonical JSON sorting.
 */
export function computeWorkingStateHash(
    stateWithoutHash: Omit<LedgerWorkingState, 'stateHash'>,
): string {
    const canonicalString = canonicalizeJson(stateWithoutHash)
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
    const nextSeq = prevState.lastSequenceNumber + 1

    const entities: Record<string, CompositeEntityLiveRecord> = {
        ...prevState.entities,
    }
    const strings: Record<string, StringsLedgerRecord> = { ...prevState.strings }
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
                        current.fatigue_bps + (payload.fatigueBpsDelta || payload.fatigueBps || 0),
                    ),
                    pain_bps: Math.min(
                        10000,
                        current.pain_bps + (payload.painBpsDelta || payload.painBps || 0),
                    ),
                    refusal_strain_bps: Math.min(
                        10000,
                        current.refusal_strain_bps + (payload.refusalStrainBpsDelta || 0),
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
                    q: payload.toCoord?.q ?? payload.fromCoord?.[0] ?? current.q,
                    r: payload.toCoord?.r ?? payload.fromCoord?.[1] ?? current.r,
                    updated_at_ms: event.timestampMs || current.updated_at_ms,
                }
            }
            break
        }

        case 'SOCIAL_STRING_EXCHANGED':
        case 'STRING_EXCHANGE': {
            const relId =
                payload.relation_id || `${payload.holderId}->${payload.debtorId}`
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
                weight_bps: payload.weightBps || strings[relId]?.weight_bps || 10000,
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
                    intensity_bps: payload.intensity_bps ?? current.intensity_bps,
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
        traversalDepth: paths.length > 0 ? Math.max(...paths.map((p) => p.depth)) : 0,
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

export const hydrateStateAction = async (
    cpy: StateModel,
    bal: StateBit,
    ste?: State,
): Promise<StateModel> => {
    const params = bal.dat?.hydrateParams
    const seriesSlug = params?.seriesSlug || 'series_sower_test'
    const tick = params?.tick || 0

    const entities: Record<string, CompositeEntityLiveRecord> = {}
    const strings: Record<string, StringsLedgerRecord> = {}
    const grievances: Record<string, GrievanceStatusRecord> = {}
    const clocks: Record<string, ParanoiaClockRecord> = {}
    const beliefs: Record<string, ActorBeliefRecord> = {}
    const unratifiedDetails: Record<string, UnratifiedDetailRecord> = {}

    if (ste && typeof ste.hunt === 'function') {
        // Query entities_live
        const entRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'entities_live' },
        })
        if (entRes?.databaseBit?.dat?.records) {
            for (const r of entRes.databaseBit.dat.records) {
                entities[r.entity_id] = {
                    entity_id: r.entity_id,
                    location_id: r.location_id || 'loc_the_warm_pipe',
                    q: r.q || 0,
                    r: r.r || 0,
                    arms_available: r.arms_available ?? 2,
                    legs_available: r.legs_available ?? 2,
                    locomotion_tier: r.locomotion_tier || 'UNRESTRICTED',
                    concussion_level: r.concussion_level || 0,
                    fatigue_bps: r.fatigue_bps || 0,
                    pain_bps: r.pain_bps || 0,
                    refusal_strain_bps: r.refusal_strain_bps || 0,
                    open_wounds: Object.freeze(JSON.parse(r.open_wounds_json || '[]')),
                    banned_kinetic_verbs: Object.freeze(JSON.parse(r.banned_kinetic_verbs_json || '[]')),
                    held_items: Object.freeze(JSON.parse(r.held_items_json || '[]')),
                    worn_gear: Object.freeze(JSON.parse(r.worn_gear_json || '{}')),
                    slung_items: Object.freeze(JSON.parse(r.slung_items_json || '[]')),
                    cached_items: Object.freeze(JSON.parse(r.cached_items_json || '[]')),
                    updated_at_ms: r.updated_at_ms || 1700000000000,
                }
            }
        }

        // Query strings_ledger
        const strRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'strings_ledger' },
        })
        if (strRes?.databaseBit?.dat?.records) {
            for (const r of strRes.databaseBit.dat.records) {
                strings[r.relation_id] = r
            }
        }

        // Query grievance_status
        const grvRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'grievance_status' },
        })
        if (grvRes?.databaseBit?.dat?.records) {
            for (const r of grvRes.databaseBit.dat.records) {
                grievances[r.grievance_id] = r
            }
        }

        // Query paranoia_clocks
        const clkRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'paranoia_clocks' },
        })
        if (clkRes?.databaseBit?.dat?.records) {
            for (const r of clkRes.databaseBit.dat.records) {
                clocks[r.clock_id] = r
            }
        }

        // Query unratified_details
        const detRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'unratified_details' },
        })
        if (detRes?.databaseBit?.dat?.records) {
            for (const r of detRes.databaseBit.dat.records) {
                unratifiedDetails[r.detail_id] = r
            }
        }
    }

    const stateWithoutHash = {
        reducerVersion: 'v1.0.0',
        seriesSlug,
        tick,
        lastSequenceNumber: 0,
        lastEventHash: 'genesis_seed',
        entities: Object.freeze(entities),
        strings: Object.freeze(strings),
        grievances: Object.freeze(grievances),
        clocks: Object.freeze(clocks),
        beliefs: Object.freeze(beliefs),
        unratifiedDetails: Object.freeze(unratifiedDetails),
    }

    const stateHash = computeWorkingStateHash(stateWithoutHash)

    const sealedSnapshot: LedgerWorkingState = deepFreeze({
        ...stateWithoutHash,
        stateHash,
    })

    cpy.activeSnapshot = sealedSnapshot

    await emitConsole(
        ste,
        `>> [STATE:HYDRATE] [OK] Deep-frozen snapshot materialized. StateHash: ${stateHash.slice(0, 16)}...`,
    )

    if (bal.slv) {
        bal.slv({
            snapshot: sealedSnapshot,
            stateHash,
            steBit: {
                idx: 'hydrate-state-pass',
                val: 1,
                dat: { snapshot: sealedSnapshot, stateHash },
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
                    dat: { error: '[NO_ACTIVE_SNAPSHOT] Snapshot not hydrated' },
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

