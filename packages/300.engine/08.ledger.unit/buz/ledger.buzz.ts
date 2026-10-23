import clone from 'clone-deep'
import type { LedgerModel } from '../ledger.model'
import { StagingAccumulator } from '../ledger.model'
import type LedgerBit from '../fce/ledger.bit'
import type State from '../../99.core/state'
import type {
    EventEnvelope,
    PreparedBatchStatement,
} from '../fce/ledger.interface'
import type {
    LedgerWorkingState,
    CompositeEntityLiveRecord,
    StringsLedgerRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    ActorBeliefRecord,
    UnratifiedDetailRecord,
} from '../../16.state.unit/fce/state.interface'
import {
    computeWorkingStateHash,
    recursiveDeepFreeze,
} from '../../16.state.unit/buz/state.buzz'

const logConsole = async (ste: State, src: string) => {
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Degrades cleanly in unit tests
        }
    }
}

/**
 * Clamps basis points strictly to [0, 10000] using integer arithmetic.
 */
export function clampBps(val: number): number {
    if (val <= 0) return 0
    if (val >= 10000) return 10000
    return Math.floor(val)
}

/**
 * Pure state reducer function: S_{n+1} = R(S_n, E_n, sigma_n)
 * STRICT INVARIANT: Pure function. Zero I/O, zero async, zero Date.now(), zero Math.random().
 */
export function reduceLedgerState(
    prevState: LedgerWorkingState,
    event: EventEnvelope,
    _seed: string,
): LedgerWorkingState {
    // 1. Assert Monotonic Sequence Continuity
    if (event.sequenceNumber !== prevState.lastSequenceNumber + 1) {
        throw new Error(
            `[OCC_SEQUENCE_CONFLICT]: Stale sequence token. Expected #${prevState.lastSequenceNumber + 1}, received #${event.sequenceNumber}`,
        )
    }

    // 2. Clone maps cleanly
    const nextEntities: Record<string, CompositeEntityLiveRecord> = clone(
        prevState.entities,
        true,
    )
    const nextStrings: Record<string, StringsLedgerRecord> = clone(
        prevState.strings,
        true,
    )
    const nextGrievances: Record<string, GrievanceStatusRecord> = clone(
        prevState.grievances,
        true,
    )
    const nextClocks: Record<string, ParanoiaClockRecord> = clone(
        prevState.clocks,
        true,
    )
    const nextBeliefs: Record<string, ActorBeliefRecord> = clone(
        prevState.beliefs,
        true,
    )
    const nextDetails: Record<string, UnratifiedDetailRecord> = clone(
        prevState.unratifiedDetails,
        true,
    )

    const payload: any = event.payload || {}

    // 3. Sub-reduction by discriminated event type
    switch (event.type) {
        case 'SOMATIC_TRAUMA_APPLIED': {
            const ent = nextEntities[payload.entity_id]
            if (ent) {
                const addedWounds: string[] = payload.added_wounds || []
                const addedVerbs: string[] = payload.banned_verbs || []
                const combinedWounds = Array.from(
                    new Set([...ent.open_wounds, ...addedWounds]),
                ).sort()
                const combinedVerbs = Array.from(
                    new Set([...ent.banned_kinetic_verbs, ...addedVerbs]),
                ).sort()

                nextEntities[payload.entity_id] = {
                    ...ent,
                    arms_available:
                        payload.arms_available ?? ent.arms_available,
                    legs_available:
                        payload.legs_available ?? ent.legs_available,
                    locomotion_tier:
                        payload.locomotion_tier ?? ent.locomotion_tier,
                    concussion_level:
                        payload.concussion_level ?? ent.concussion_level,
                    fatigue_bps: clampBps(
                        ent.fatigue_bps + (payload.fatigue_bps_delta ?? 0),
                    ),
                    pain_bps: clampBps(
                        ent.pain_bps + (payload.pain_bps_delta ?? 0),
                    ),
                    refusal_strain_bps: clampBps(
                        ent.refusal_strain_bps +
                            (payload.refusal_strain_bps_delta ?? 0),
                    ),
                    open_wounds: combinedWounds,
                    banned_kinetic_verbs: combinedVerbs,
                    updated_at_ms: event.timestamp_ms,
                }
            }
            break
        }

        case 'INVENTORY_TRANSFERRED': {
            const ent = nextEntities[payload.entity_id]
            if (ent) {
                const nextHeld = payload.held_items
                    ? [...payload.held_items]
                    : ent.held_items
                const held_items = nextHeld
                if (held_items.length > ent.arms_available) {
                    throw new Error(
                        `[HAND_CAPACITY_BREACH]: Entity ${payload.entity_id} attempted to hold ${nextHeld.length} items with only ${ent.arms_available} arm(s)`,
                    )
                }
                nextEntities[payload.entity_id] = {
                    ...ent,
                    held_items: nextHeld,
                    worn_gear: payload.worn_gear
                        ? { ...payload.worn_gear }
                        : ent.worn_gear,
                    slung_items: payload.slung_items
                        ? [...payload.slung_items]
                        : ent.slung_items,
                    cached_items: payload.cached_items
                        ? [...payload.cached_items]
                        : ent.cached_items,
                    updated_at_ms: event.timestamp_ms,
                }
            }
            break
        }

        case 'SPATIAL_DISPLACEMENT_COMMITTED': {
            const ent = nextEntities[payload.entity_id]
            if (ent) {
                nextEntities[payload.entity_id] = {
                    ...ent,
                    location_id: payload.to_location_id ?? ent.location_id,
                    q: payload.to_q ?? ent.q,
                    r: payload.to_r ?? ent.r,
                    updated_at_ms: event.timestamp_ms,
                }
            }
            break
        }

        case 'SOCIAL_STRING_EXCHANGED': {
            if (payload.holder_id === payload.debtor_id) {
                throw new Error(
                    `[ANTI_REFLEXIVITY_BREACH]: Social string holder and debtor cannot be identical (${payload.holder_id})`,
                )
            }
            const pairKey = `${payload.holder_id}:${payload.debtor_id}`
            const existing = nextStrings[pairKey] || {
                relation_id: payload.relation_id || `rel_${pairKey}`,
                holder_id: payload.holder_id,
                debtor_id: payload.debtor_id,
                weight_bps: 0,
                strings_count: 0,
                updated_at_ms: event.timestamp_ms,
            }

            const countDelta = payload.strings_count_delta ?? 0
            const nextCount = existing.strings_count + countDelta
            if (nextCount < 0) {
                throw new Error(
                    `[SOLVENCY_BREACH]: Insufficient strings balance (${existing.strings_count}) for debit of ${Math.abs(countDelta)}`,
                )
            }

            nextStrings[pairKey] = {
                ...existing,
                weight_bps: clampBps(
                    existing.weight_bps + (payload.weight_bps_delta ?? 0),
                ),
                strings_count: nextCount,
                updated_at_ms: event.timestamp_ms,
            }
            break
        }

        case 'GRIEVANCE_LIFECYCLE_MUTATED': {
            if (
                payload.instigator_id &&
                payload.victim_id &&
                payload.instigator_id === payload.victim_id
            ) {
                throw new Error(
                    `[ANTI_REFLEXIVITY_BREACH]: Grievance instigator and victim cannot be identical (${payload.instigator_id})`,
                )
            }
            const existing = nextGrievances[payload.grievance_id] || {
                grievance_id: payload.grievance_id,
                instigator_id: payload.instigator_id,
                victim_id: payload.victim_id,
                escalation_depth: 0,
                cooldown_cycles: 0,
                intensity_bps: 0,
                status: 'DORMANT',
                updated_at_ms: event.timestamp_ms,
            }

            nextGrievances[payload.grievance_id] = {
                ...existing,
                escalation_depth: Math.max(
                    0,
                    existing.escalation_depth +
                        (payload.escalation_depth_delta ?? 0),
                ),
                cooldown_cycles: Math.max(
                    0,
                    payload.cooldown_cycles ?? existing.cooldown_cycles,
                ),
                intensity_bps: clampBps(
                    existing.intensity_bps + (payload.intensity_bps_delta ?? 0),
                ),
                status: payload.status ?? existing.status,
                updated_at_ms: event.timestamp_ms,
            }
            break
        }

        case 'PARANOIA_CLOCK_TICKED': {
            const clockKey = payload.clock_id
            const existing = nextClocks[clockKey]
            if (existing) {
                const nextVal = clampBps(
                    existing.value_bps + (payload.value_bps_delta ?? 0),
                )
                nextClocks[clockKey] = {
                    ...existing,
                    value_bps: nextVal,
                    is_triggered: nextVal >= existing.threshold_bps ? 1 : 0,
                    updated_at_ms: event.timestamp_ms,
                }
            }
            break
        }

        case 'BELIEF_RECORDED': {
            const bKey = payload.belief_id
            nextBeliefs[bKey] = {
                belief_id: payload.belief_id,
                observer_id: payload.observer_id,
                fact_id: payload.fact_id,
                subjective_probability_bps: clampBps(
                    payload.subjective_probability_bps ?? 10000,
                ),
                source_type: payload.source_type ?? 'DIRECT_OBSERVATION',
                is_false_belief: payload.is_false_belief ?? 0,
                learned_at_ms: payload.learned_at_ms ?? event.timestamp_ms,
                updated_at_ms: event.timestamp_ms,
            }
            break
        }

        case 'UNRATIFIED_DETAIL_STAGED': {
            const dKey = payload.detail_id
            nextDetails[dKey] = {
                detail_id: payload.detail_id,
                scene_id: payload.scene_id,
                entity_id: payload.entity_id,
                salience_bps: clampBps(payload.salience_bps ?? 7000),
                claim_proposal: payload.claim_proposal,
                status: payload.status ?? 'STAGED',
                created_at_ms: payload.created_at_ms ?? event.timestamp_ms,
                reviewed_at_ms: payload.reviewed_at_ms,
            }
            break
        }

        case 'SIMULATION_TICK_COMMITTED': {
            // Ticks advance through the wrapper envelope
            break
        }

        default:
            break
    }

    // 4. Compute next canonical state hash & deep-freeze
    const nextStateHash = computeWorkingStateHash({
        entities: nextEntities,
        strings: nextStrings,
        grievances: nextGrievances,
        clocks: nextClocks,
        beliefs: nextBeliefs,
        unratifiedDetails: nextDetails,
    })

    const nextState: LedgerWorkingState = {
        reducerVersion: prevState.reducerVersion,
        seriesSlug: prevState.seriesSlug,
        tick: Math.max(prevState.tick, event.tick),
        lastSequenceNumber: event.sequenceNumber,
        lastEventHash: event.stateHash,
        entities: nextEntities,
        strings: nextStrings,
        grievances: nextGrievances,
        clocks: nextClocks,
        beliefs: nextBeliefs,
        unratifiedDetails: nextDetails,
        stateHash: nextStateHash,
    }

    return recursiveDeepFreeze(nextState)
}

/**
 * Pure historical fold operation: State_N = fold(reduceLedgerState, State_0, [E_1 ... E_N], seed)
 */
export function foldLedgerEvents(
    initialState: LedgerWorkingState,
    events: readonly EventEnvelope[],
    seed: string,
): LedgerWorkingState {
    return events.reduce((currentState, ev) => {
        return reduceLedgerState(currentState, ev, seed)
    }, initialState)
}

export const initLedger = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste: State,
) => {
    await logConsole(
        ste,
        '>> [LEDGER:INIT] Initializing 08.ledger.unit pure engine & staging...',
    )
    cpy.activeSequence = 0
    cpy.activeAccumulator = null
    if (bal?.slv != null) {
        bal.slv({ ldgBit: { idx: 'init-ledger', val: 1 } })
    }
    return cpy
}

export const updateLedger = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    _ste: State,
) => {
    if (bal?.val !== undefined) cpy.activeSequence = bal.val
    if (bal?.slv != null) {
        bal.slv({ ldgBit: { idx: 'update-ledger', val: cpy.activeSequence } })
    }
    return cpy
}

export const reduceLedger = (cpy: LedgerModel, bal: LedgerBit, _ste: State) => {
    const currentState: LedgerWorkingState = (bal?.dat as any)?.state
    const event: EventEnvelope = (bal?.dat as any)?.event
    const seed: string = (bal?.dat as any)?.seed || 'seed_00'

    const nextState = reduceLedgerState(currentState, event, seed)
    if (bal?.slv != null) {
        bal.slv({ ldgBit: { idx: 'reduce-ledger', dat: nextState } })
    }
    return cpy
}

export const stageEventLedger = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste: State,
) => {
    const dat: any = bal?.dat || {}
    let accumulator = cpy.activeAccumulator

    if (!accumulator) {
        const baseState: LedgerWorkingState = dat.baseState
        if (!baseState) {
            throw new Error(
                '[STAGE:ERR] Missing baseState to initialize StagingAccumulator',
            )
        }
        accumulator = new StagingAccumulator(baseState)
        cpy.activeAccumulator = accumulator
    }

    const staged = accumulator.stageEvent(dat.type, dat.payload, {
        eventId: dat.eventId,
        streamId: dat.streamId || 'main',
        tick: dat.tick ?? accumulator.workingState.tick,
        actorId: dat.actorId || null,
        targetId: dat.targetId || null,
        seed: dat.seed || 'seed_stage',
        timestamp_ms: dat.timestamp_ms || Date.now(),
        topologyHash: dat.topologyHash,
        overlayHash: dat.overlayHash,
        queryHash: dat.queryHash,
        receiptHash: dat.receiptHash,
    })

    await logConsole(
        ste,
        `>> [STAGE:EVENT] [OK] Staged '${staged.type}' (#${staged.sequenceNumber}) in volatile RAM. Staged total: ${accumulator.stagedCount}`,
    )

    if (bal?.slv != null) {
        bal.slv({
            ldgBit: {
                idx: 'stage-event-ledger',
                val: accumulator.stagedCount,
                dat: {
                    stagedEnvelope: staged,
                    workingState: accumulator.workingState,
                },
            },
        })
    }
    return cpy
}

export const validateStagedLedger = (
    cpy: LedgerModel,
    bal: LedgerBit,
    _ste: State,
) => {
    if (!cpy.activeAccumulator) {
        if (bal?.slv != null) {
            bal.slv({
                ldgBit: {
                    idx: 'validate-staged-ledger',
                    val: 0,
                    dat: { valid: true, violations: [] },
                },
            })
        }
        return cpy
    }
    const result = cpy.activeAccumulator.validateInvariants()
    if (bal?.slv != null) {
        bal.slv({
            ldgBit: {
                idx: result.valid
                    ? 'validate-staged-ledger-ok'
                    : 'validate-staged-ledger-fail',
                val: result.valid ? 1 : 0,
                dat: result,
            },
        })
    }
    return cpy
}

export const rollbackStagedLedger = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste: State,
) => {
    if (cpy.activeAccumulator) {
        const droppedCount = cpy.activeAccumulator.stagedCount
        cpy.activeAccumulator.rollback()
        cpy.activeAccumulator = null
        await logConsole(
            ste,
            `:: [STAGE:ROLLBACK] Discarded ${droppedCount} staged event(s) at $0.00 compute spend. Zero SQLite rows touched.`,
        )
    }
    if (bal?.slv != null) {
        bal.slv({ ldgBit: { idx: 'rollback-staged-ledger', val: 0 } })
    }
    return cpy
}

export const commitStagedLedger = async (
    cpy: LedgerModel,
    bal: LedgerBit,
    ste: State,
) => {
    if (!cpy.activeAccumulator) {
        throw new Error('[COMMIT:ERR] No active StagingAccumulator to commit')
    }

    const accumulator = cpy.activeAccumulator
    const validation = accumulator.validateInvariants()
    if (!validation.valid) {
        await logConsole(
            ste,
            `:: [STAGE:COMMIT_FAIL] Invariant breach detected: ${validation.violations.join('; ')}. Initiating zero-cost rollback.`,
        )
        accumulator.rollback()
        cpy.activeAccumulator = null
        throw new Error(
            `[STAGING_INVARIANT_BREACH]: ${validation.violations.join('; ')}`,
        )
    }

    const { committedEvents, newState } = accumulator.commit()
    const batchStatements: PreparedBatchStatement[] =
        accumulator.compileBatchStatements(committedEvents)

    await logConsole(
        ste,
        `>> [STAGE:COMMIT] Flashing ${committedEvents.length} event(s) and ${batchStatements.length} statement(s) atomically to local SQLite...`,
    )

    // Execute atomic batch transaction through 02.database.unit
    await ste.hunt('[Database action] Exec Batch Database', {
        dat: { statements: batchStatements },
    })

    cpy.activeSequence = newState.lastSequenceNumber
    cpy.activeAccumulator = null

    await logConsole(
        ste,
        `>> [STAGE:COMMIT] [OK] Successfully committed Seq #${newState.lastSequenceNumber} | Hash: ${newState.stateHash.slice(0, 8)}...`,
    )

    if (bal?.slv != null) {
        bal.slv({
            ldgBit: {
                idx: 'commit-staged-ledger',
                val: committedEvents.length,
                dat: { newState, committedEvents },
            },
        })
    }
    return cpy
}

export const foldLedgerEventsBuzz = (
    cpy: LedgerModel,
    bal: LedgerBit,
    _ste: State,
) => {
    const initialState: LedgerWorkingState = (bal?.dat as any)?.initialState
    const events: EventEnvelope[] = (bal?.dat as any)?.events || []
    const seed: string = (bal?.dat as any)?.seed || 'seed_fold'

    const finalState = foldLedgerEvents(initialState, events, seed)
    if (bal?.slv != null) {
        bal.slv({ ldgBit: { idx: 'fold-ledger-events', dat: finalState } })
    }
    return cpy
}
