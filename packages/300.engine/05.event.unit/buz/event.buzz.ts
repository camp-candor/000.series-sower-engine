/**
 * 05.event.unit - Event Buzz Business Logic
 * Append-only persistence, sequence synchronization, and read-time upcasting.
 */
import { EventModel } from '../event.model.js'
import type EventBit from '../fce/event.bit.js'
import type { EventEnvelope } from '../../04.envelope.unit/fce/envelope.interface.js'
import type { EventLogRecord } from '../../02.database.unit/fce/database.interface.js'
import {
    CURRENT_EVENT_VERSIONS,
    type CanonicalSimulationEventType,
    type PacingActStage,
    type ActWindowMode,
    type PacingBudgetPolicy,
    type PacingBudgetState,
    type PacingGateDecision,
    type SignificantEventCandidate,
    DEFAULT_PACING_BUDGET_POLICY,
} from '../fce/event.interface.js'
import {
    computeCombinedPacingMultiplierBps,
    computeHorizonProgressBps,
    computeSolarDayProgressBps,
    resolveThreeActStage,
} from '../../20.arithmetic.unit/buz/arithmetic.buzz.js'
import type { SimulationClockState } from '../../17.tick.unit/fce/tick.interface.js'
import * as ActEnv from '../../04.envelope.unit/envelope.action.js'
import * as ActSeq from '../../14.sequence.unit/sequence.action.js'
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

export const initEvent = async (
    cpy: EventModel,
    bal?: EventBit,
    ste?: State,
): Promise<EventModel> => {
    cpy.totalAppended = 0
    cpy.lastSequenceId = 0
    cpy.lastEventHash =
        '0000000000000000000000000000000000000000000000000000000000000000'

    await emitConsole(
        ste,
        '>> [EVENT:INIT] [OK] Append-only event ingestion engine online.',
    )

    if (bal?.slv) {
        bal.slv({
            eventBit: {
                idx: 'init-event-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateEvent = (
    cpy: EventModel,
    bal?: EventBit,
    _ste?: State,
): EventModel => {
    if (bal?.slv) {
        bal.slv({
            eventBit: {
                idx: 'update-event-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const registerUpcaster = (
    cpy: EventModel,
    bal: EventBit,
    _ste?: State,
): EventModel => {
    const params = bal.dat?.upcasterParams
    if (params && params.eventType && params.fromVersion && params.fn) {
        cpy.registry.register(params.eventType, params.fromVersion, params.fn)
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'register-upcaster-pass',
                    val: 1,
                },
            })
        }
    } else {
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'register-upcaster-fail',
                    val: 0,
                    dat: {
                        error: '[INVALID_UPCASTER_PARAMS] Missing eventType, fromVersion, or fn',
                    },
                },
            })
        }
    }
    return cpy
}

export const upcastEvent = (
    cpy: EventModel,
    bal: EventBit,
    _ste?: State,
): EventModel => {
    const envelope = bal.dat?.envelope
    if (!envelope) {
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'upcast-event-fail',
                    val: 0,
                    dat: {
                        error: '[MISSING_ENVELOPE] No envelope provided to upcast',
                    },
                },
            })
        }
        return cpy
    }

    try {
        const upcasted = cpy.registry.upcast(envelope)
        if (bal.slv) {
            bal.slv({
                envelope: upcasted,
                eventBit: {
                    idx: 'upcast-event-pass',
                    val: 1,
                    dat: { envelope: upcasted },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'upcast-event-fail',
                    val: 0,
                    dat: { error: err.message || String(err) },
                },
            })
        }
    }
    return cpy
}

export const appendEvent = async (
    cpy: EventModel,
    bal: EventBit,
    ste?: State,
): Promise<EventModel> => {
    const params = bal.dat?.appendParams
    if (!params || !params.eventId || !params.eventType) {
        const err = '[INVALID_APPEND_PARAMS] Missing eventId or eventType'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                eventBit: {
                    idx: 'append-event-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    // 1. Idempotency Check against local 02.database.unit
    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'event_log', key: params.eventId },
        })
        if (
            queryRes?.databaseBit?.val === 1 &&
            queryRes?.databaseBit?.dat?.record
        ) {
            await emitConsole(
                ste,
                `>> [EVENT:IDEMPOTENT] Duplicate event '${params.eventId}' ignored without mutation.`,
            )
            if (bal.slv) {
                bal.slv({
                    eventBit: {
                        idx: 'append-event-idempotent',
                        val: 1,
                        src: params.eventId,
                        dat: { isDuplicate: true },
                    },
                })
            }
            return cpy
        }
    }

    // 2. Monotonic Sequence Allocation via 14.sequence.unit
    let assignedSeq = cpy.lastSequenceId + 1
    if (ste && typeof ste.hunt === 'function') {
        const seqRes: any = await ste.hunt(ActSeq.NEXT_SEQUENCE, {})
        if (seqRes?.nextSeq !== undefined) {
            assignedSeq = seqRes.nextSeq
        }
    }

    // 3. Cryptographic Sealing via 04.envelope.unit
    const targetVersion =
        params.schemaVersion ||
        CURRENT_EVENT_VERSIONS[
            params.eventType as CanonicalSimulationEventType
        ] ||
        1

    let sealedEnvelope: EventEnvelope
    if (ste && typeof ste.hunt === 'function') {
        const sealRes: any = await ste.hunt(ActEnv.SEAL_EVENT_ENVELOPE, {
            dat: {
                eventId: params.eventId,
                streamId: params.streamId || 'main',
                sequenceId: assignedSeq,
                tick: params.tick || 0,
                eventType: params.eventType,
                schemaVersion: targetVersion,
                actorId: params.actorId,
                targetId: params.targetId,
                seed: params.seed || '0',
                payload: params.payload,
                prevEventHash: cpy.lastEventHash,
                timestampMs: Date.now(),
            },
        })

        if (!sealRes?.envelope) {
            throw new Error(
                `[SEAL_FAILED] 04.envelope.unit failed to seal event envelope`,
            )
        }
        sealedEnvelope = sealRes.envelope
    } else {
        // Fallback for isolated unit tests
        sealedEnvelope = {
            eventId: params.eventId,
            streamId: params.streamId || 'main',
            sequenceId: assignedSeq,
            tick: params.tick || 0,
            eventType: params.eventType,
            schemaVersion: targetVersion,
            actorId: params.actorId,
            targetId: params.targetId,
            seed: params.seed || '0',
            payload: params.payload,
            prevEventHash: cpy.lastEventHash,
            stateHash: '0'.repeat(64),
            eventHash: 'f'.repeat(64),
            timestampMs: Date.now(),
        }
    }

    // 4. Persistence to 02.database.unit
    const record: EventLogRecord = {
        sequence_id: sealedEnvelope.sequenceId,
        event_id: sealedEnvelope.eventId,
        stream_id: sealedEnvelope.streamId,
        tick: sealedEnvelope.tick,
        type: sealedEnvelope.eventType,
        version: sealedEnvelope.schemaVersion,
        actor_id: sealedEnvelope.actorId,
        target_id: sealedEnvelope.targetId,
        seed: sealedEnvelope.seed,
        payload_json: JSON.stringify(sealedEnvelope.payload),
        prev_hash: sealedEnvelope.prevEventHash,
        state_hash: sealedEnvelope.eventHash,
        timestamp_ms: sealedEnvelope.timestampMs,
    }

    if (ste && typeof ste.hunt === 'function') {
        const dbRes: any = await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'event_log',
                        action: 'INSERT',
                        key: record.event_id,
                        record,
                    },
                ],
            },
        })

        if (dbRes?.databaseBit?.val === 0) {
            const err =
                dbRes?.databaseBit?.dat?.error || 'Database insert rejected'
            throw new Error(`[APPEND_DB_FAILURE] ${err}`)
        }

        // Commit sequence advancement in 14.sequence.unit
        await ste.hunt(ActSeq.COMMIT_SEQUENCE, {
            val: record.sequence_id,
            dat: { eventId: record.event_id },
        })
    }

    // 5. Update local tracking state
    cpy.lastSequenceId = sealedEnvelope.sequenceId
    cpy.lastEventHash = sealedEnvelope.eventHash
    cpy.totalAppended += 1

    await emitConsole(
        ste,
        `>> [EVENT:APPEND] [OK] Stamped #${sealedEnvelope.sequenceId} (${sealedEnvelope.eventType}) -> ${sealedEnvelope.eventHash.slice(0, 16)}...`,
    )

    if (bal.slv) {
        bal.slv({
            envelope: sealedEnvelope,
            eventBit: {
                idx: 'append-event-pass',
                val: sealedEnvelope.sequenceId,
                src: sealedEnvelope.eventHash,
                dat: {
                    envelope: sealedEnvelope,
                    totalCount: cpy.totalAppended,
                },
            },
        })
    }

    return cpy
}

export const streamEvents = async (
    cpy: EventModel,
    bal: EventBit,
    ste?: State,
): Promise<EventModel> => {
    let rawRecords: EventLogRecord[] = []

    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'event_log' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            rawRecords = [...queryRes.databaseBit.dat.records]
        }
    }

    // Sort strictly by sequence_id ascending
    rawRecords.sort((a, b) => a.sequence_id - b.sequence_id)

    const fromSeq = bal.dat?.streamParams?.fromSequenceId || 0
    const limit = bal.dat?.streamParams?.limit || 1000

    const filtered = rawRecords
        .filter((r) => r.sequence_id >= fromSeq)
        .slice(0, limit)

    // Reconstruct and upcast in volatile memory
    const upgradedEnvelopes: EventEnvelope[] = []

    for (const record of filtered) {
        let payload: any
        try {
            payload = JSON.parse(record.payload_json)
        } catch {
            payload = record.payload_json
        }

        const rawEnvelope: EventEnvelope = {
            eventId: record.event_id,
            streamId: record.stream_id,
            sequenceId: record.sequence_id,
            tick: record.tick,
            eventType: record.type,
            schemaVersion: record.version,
            actorId: record.actor_id,
            targetId: record.target_id,
            seed: record.seed,
            payload,
            prevEventHash: record.prev_hash,
            stateHash: record.prev_hash,
            eventHash: record.state_hash,
            timestampMs: record.timestamp_ms,
        }

        // Apply read-time upcasters
        const upcasted = cpy.registry.upcast(rawEnvelope)
        upgradedEnvelopes.push(upcasted)
    }

    await emitConsole(
        ste,
        `>> [EVENT:STREAM] Streamed and upcasted ${upgradedEnvelopes.length} events from sequence #${fromSeq}`,
    )

    if (bal.slv) {
        bal.slv({
            envelopes: upgradedEnvelopes,
            eventBit: {
                idx: 'stream-events-pass',
                val: upgradedEnvelopes.length,
                dat: {
                    envelopes: upgradedEnvelopes,
                    totalCount: upgradedEnvelopes.length,
                },
                lst: upgradedEnvelopes,
            },
        })
    }

    return cpy
}

export const evaluateEventSignificance = (
    candidate: {
        readonly tick: number
        readonly category:
            | 'PARANOIA_TRIGGERED'
            | 'GRIEVANCE_BREACH'
            | 'SOMATIC_TRAUMA'
            | 'INVENTORY_TRANSFER'
            | 'EPISTEMIC_REVEAL'
            | 'CHRONO_MILESTONE'
        readonly severityBps: number
        readonly triggerReason: string
    },
    config: {
        readonly globalThresholdBps: number
        readonly perCategoryThresholdBps?: Partial<Record<string, number>>
        readonly enabledCategories?: Partial<Record<string, boolean>>
        readonly cooldownTicks?: Partial<Record<string, number>>
    },
    cooldownState: Partial<Record<string, number>> = {},
): {
    readonly significant: boolean
    readonly reason: string
    readonly severityBps: number
} => {
    if (!Number.isInteger(candidate.severityBps)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] severityBps must be a discrete integer. Received: ${String(candidate.severityBps)}`,
        )
    }
    if (candidate.severityBps < 0 || candidate.severityBps > 10000) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] severityBps out of bounds [0, 10000]: ${String(candidate.severityBps)}`,
        )
    }
    if (!Number.isInteger(config.globalThresholdBps)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] globalThresholdBps must be a discrete integer. Received: ${String(config.globalThresholdBps)}`,
        )
    }
    if (config.globalThresholdBps < 0 || config.globalThresholdBps > 10000) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] globalThresholdBps out of bounds [0, 10000]: ${String(config.globalThresholdBps)}`,
        )
    }
    const perThreshold = config.perCategoryThresholdBps?.[candidate.category]
    if (perThreshold !== undefined) {
        if (!Number.isInteger(perThreshold)) {
            throw new TypeError(
                `[FLOAT_PROHIBITED] perCategoryThresholdBps must be a discrete integer. Received: ${String(perThreshold)}`,
            )
        }
        if (perThreshold < 0 || perThreshold > 10000) {
            throw new RangeError(
                `[OUT_OF_BOUNDS] perCategoryThresholdBps out of bounds [0, 10000]: ${String(perThreshold)}`,
            )
        }
    }
    const cooldown = config.cooldownTicks?.[candidate.category] ?? 0
    if (!Number.isInteger(cooldown) || cooldown < 0) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] cooldown_ticks must be non-negative integer: ${String(cooldown)}`,
        )
    }
    const enabled = config.enabledCategories?.[candidate.category]
    if (enabled === false) {
        return {
            significant: false,
            reason: `CATEGORY_DISABLED:${candidate.category}`,
            severityBps: candidate.severityBps,
        }
    }
    const threshold = perThreshold ?? config.globalThresholdBps
    if (candidate.severityBps < threshold) {
        return {
            significant: false,
            reason: `BELOW_THRESHOLD:${candidate.severityBps}<${threshold}`,
            severityBps: candidate.severityBps,
        }
    }
    const lastTick = cooldownState[candidate.category]
    if (
        lastTick !== undefined &&
        Number.isInteger(lastTick) &&
        candidate.tick - (lastTick as number) < cooldown
    ) {
        return {
            significant: false,
            reason: `COOLDOWN_ACTIVE:${candidate.category}@${String(lastTick)}`,
            severityBps: candidate.severityBps,
        }
    }
    return {
        significant: true,
        reason: `SIGNIFICANT:${candidate.category}:${candidate.severityBps}`,
        severityBps: candidate.severityBps,
    }
}

export const detectSignificantEvent = (
    cpy: EventModel,
    bal: EventBit,
    _ste?: State,
): EventModel => {
    const dat = (bal as unknown as { dat?: Record<string, unknown> })?.dat
    const candidate = dat?.['candidate'] as
        | {
              readonly tick: number
              readonly category:
                  | 'PARANOIA_TRIGGERED'
                  | 'GRIEVANCE_BREACH'
                  | 'SOMATIC_TRAUMA'
                  | 'INVENTORY_TRANSFER'
                  | 'EPISTEMIC_REVEAL'
                  | 'CHRONO_MILESTONE'
              readonly severityBps: number
              readonly triggerReason: string
              readonly actorsInvolved?: readonly string[]
              readonly locationId?: string
              readonly stateDeltaSummary?: string
          }
        | undefined
    const config = dat?.['config'] as
        | {
              readonly globalThresholdBps: number
              readonly perCategoryThresholdBps?: Partial<Record<string, number>>
              readonly enabledCategories?: Partial<Record<string, boolean>>
              readonly cooldownTicks?: Partial<Record<string, number>>
          }
        | undefined
    const cooldownState = ((dat?.['cooldownState'] as Partial<
        Record<string, number>
    >) ?? {}) as Partial<Record<string, number>>
    if (candidate == null || config == null) {
        if (bal?.slv) {
            bal.slv({
                eventBit: {
                    idx: 'detect-significant-fail',
                    val: 0,
                    dat: {
                        error: '[INVALID_DETECT_PARAMS] Missing candidate or config',
                    },
                },
            })
        }
        return cpy
    }
    try {
        const verdict = evaluateEventSignificance(
            candidate,
            config,
            cooldownState,
        )
        if (verdict.significant) {
            const tracked = (
                cpy as unknown as { detectedSignificant?: unknown[] }
            ).detectedSignificant
            const record = Object.freeze({
                eventSequence: (dat?.['eventSequence'] as number) ?? 0,
                tick: candidate.tick,
                clockSnapshot: (dat?.['clockSnapshot'] as Record<
                    string,
                    string
                >) ?? {
                    isoDate: '2026-10-31',
                    clockTimeHm: '21:00',
                    clockTimeHms: '21:00:00',
                    timecodeSmpte: '00:00:00:00',
                    daypart: 'NIGHT',
                },
                category: candidate.category,
                severityBps: candidate.severityBps,
                triggerReason: candidate.triggerReason,
                actorsInvolved: Object.freeze([
                    ...(candidate.actorsInvolved ?? []),
                ]),
                locationId: candidate.locationId ?? 'loc_unknown',
                stateDeltaSummary:
                    candidate.stateDeltaSummary ?? candidate.triggerReason,
                causalHash: `causal_${candidate.category}_${candidate.tick}_${candidate.severityBps}`,
            })
            ;(
                cpy as unknown as { detectedSignificant?: unknown[] }
            ).detectedSignificant = Object.freeze([
                ...(tracked ?? []),
                record,
            ]) as unknown[]
        }
        if (bal?.slv) {
            bal.slv({
                eventBit: {
                    idx: verdict.significant
                        ? 'detect-significant-pass'
                        : 'detect-significant-filtered',
                    val: verdict.significant ? 1 : 0,
                    dat: { verdict },
                },
            })
        }
    } catch (err: unknown) {
        if (bal?.slv) {
            bal.slv({
                eventBit: {
                    idx: 'detect-significant-fail',
                    val: 0,
                    dat: {
                        error: err instanceof Error ? err.message : String(err),
                    },
                },
            })
        }
    }
    return cpy
}

const resolveDiurnalWeightBps = (
    policy: PacingBudgetPolicy,
    daypart: string,
): number => {
    const weights = policy.diurnal_weights_bps as unknown as Record<
        string,
        unknown
    >
    const raw = weights?.[daypart]
    return Number.isInteger(raw) && (raw as number) >= 0
        ? (raw as number)
        : 10000
}

const resolveActMultiplierBps = (
    policy: PacingBudgetPolicy,
    stage: PacingActStage,
): number => {
    if (stage === 'ACT_I') return policy.act_i_multiplier_bps
    if (stage === 'ACT_II') return policy.act_ii_multiplier_bps
    return policy.act_iii_multiplier_bps
}

export const evaluatePacingTensionGate = (
    candidate: SignificantEventCandidate,
    pacingState: PacingBudgetState,
    policy: PacingBudgetPolicy = DEFAULT_PACING_BUDGET_POLICY,
    clockState?: SimulationClockState,
    totalTicks = 96,
    agendaContext?: {
        readonly activeReserveLocks?: readonly unknown[]
        readonly isDroughtBreakerCandidate?: boolean
    },
): PacingGateDecision => {
    if (!Number.isInteger(candidate.tick) || candidate.tick < 0) {
        throw new RangeError(
            '[INVALID_PACING_TICK] candidate tick must be non-negative integer',
        )
    }
    if (
        !Number.isInteger(candidate.severityBps) ||
        candidate.severityBps < 0 ||
        candidate.severityBps > 10000
    ) {
        throw new RangeError(
            '[OUT_OF_BOUNDS] severityBps out of bounds [0, 10000]',
        )
    }
    const safeTotal =
        Number.isInteger(totalTicks) && totalTicks > 0 ? totalTicks : 96
    const mode: ActWindowMode = policy.act_window_mode
    let progressBps: number
    if (mode === 'SOLAR_24H_CYCLE' && clockState != null) {
        const elapsed =
            clockState.hour * 3600 + clockState.minute * 60 + clockState.second
        progressBps = computeSolarDayProgressBps(elapsed)
    } else if (mode === 'HORIZON_PERCENT') {
        progressBps = computeHorizonProgressBps(candidate.tick, safeTotal)
    } else {
        progressBps = computeHorizonProgressBps(
            candidate.tick,
            Math.max(safeTotal, 1),
        )
    }
    const actStage = resolveThreeActStage(
        progressBps,
        policy.act_i_end_bps,
        policy.act_ii_end_bps,
    )
    const actMultiplierBps = resolveActMultiplierBps(policy, actStage)
    const daypart =
        clockState != null && typeof clockState.daypart === 'string'
            ? clockState.daypart
            : 'NIGHT'
    const diurnalWeightBps = resolveDiurnalWeightBps(policy, daypart)
    const combinedMultiplierBps = computeCombinedPacingMultiplierBps(
        actMultiplierBps,
        diurnalWeightBps,
    )
    const lastTick = pacingState.lastSceneTick
    const ticksSinceLastScene =
        lastTick == null ? candidate.tick : candidate.tick - lastTick
    const safeTicksSince =
        Number.isInteger(ticksSinceLastScene) && ticksSinceLastScene >= 0
            ? ticksSinceLastScene
            : candidate.tick
    const lastElapsed = pacingState.lastSceneElapsedSeconds
    const currentElapsed =
        clockState != null
            ? clockState.totalElapsedSeconds
            : candidate.tick * 60
    const minutesSince =
        lastElapsed == null
            ? Number.MAX_SAFE_INTEGER
            : Math.floor((currentElapsed - lastElapsed) / 60)
    const inCooldown =
        (lastTick != null &&
            safeTicksSince < policy.min_ticks_between_scenes) ||
        (lastElapsed != null &&
            minutesSince < policy.min_minutes_between_scenes)
    const criticalOverrideApplied =
        candidate.severityBps >= policy.critical_override_bps
    const isChronoMilestone = candidate.category === 'CHRONO_MILESTONE'
    const suppressedByCooldown =
        !isChronoMilestone &&
        inCooldown &&
        !criticalOverrideApplied &&
        policy.enabled
    const reserveLockCount = agendaContext?.activeReserveLocks?.length ?? 0
    const isDroughtCandidate = agendaContext?.isDroughtBreakerCandidate === true
    const suppressedByAgendaReserve =
        policy.enabled &&
        reserveLockCount > 0 &&
        isDroughtCandidate &&
        !criticalOverrideApplied
    let droughtBoostBps = 0
    if (policy.enabled && safeTicksSince >= policy.max_dry_spell_ticks) {
        const over = safeTicksSince - policy.max_dry_spell_ticks + 1
        const raw = over * policy.drought_boost_bps_per_tick
        droughtBoostBps = Math.min(policy.max_drought_boost_bps, raw)
    }
    const scaled = Number(
        (BigInt(candidate.severityBps) * BigInt(combinedMultiplierBps)) /
            10000n,
    )
    const effectiveScoreBps = scaled + droughtBoostBps
    const suppressed = suppressedByCooldown || suppressedByAgendaReserve
    const significant = !suppressed
    return Object.freeze({
        suppressedByCooldown,
        suppressedByAgendaReserve,
        criticalOverrideApplied,
        actStage,
        actMultiplierBps,
        diurnalWeightBps,
        combinedMultiplierBps,
        droughtBoostBps,
        effectiveScoreBps,
        progressBps,
        ticksSinceLastScene: safeTicksSince,
        droughtBreaker: false,
        significant,
        reason: suppressedByAgendaReserve
            ? `SUPPRESSED_BY_AGENDA_RESERVE:${String(safeTicksSince)}t`
            : suppressedByCooldown
              ? `COOLDOWN_SUPPRESSED:${String(safeTicksSince)}t`
              : `PACING_PASS:${actStage}:${String(effectiveScoreBps)}`,
    })
}

export const selectDeterministicDroughtBreaker = (
    candidates: readonly SignificantEventCandidate[],
    masterSeed: string,
    tick: number,
): SignificantEventCandidate | null => {
    if (candidates.length === 0) return null
    let best = candidates[0] as SignificantEventCandidate
    let bestKey = `${String(best.severityBps).padStart(5, '0')}:${best.category}:${best.triggerReason}`
    for (const candidate of candidates.slice(1)) {
        const key = `${String(candidate.severityBps).padStart(5, '0')}:${candidate.category}:${candidate.triggerReason}`
        if (
            candidate.severityBps > best.severityBps ||
            (candidate.severityBps === best.severityBps && key > bestKey)
        ) {
            best = candidate
            bestKey = key
        }
    }
    void masterSeed
    void tick
    return best
}

export const canBeatFireUnderMaxOccurrences = (
    beat: {
        readonly beat_id: string
        readonly recurrenceRule?: { readonly maxOccurrences?: number }
    },
    currentCount: number,
): boolean => {
    const max = beat.recurrenceRule?.maxOccurrences
    if (max == null) return true
    if (!Number.isInteger(max) || (max as number) < 1) return true
    if (!Number.isInteger(currentCount) || currentCount < 0) return true
    return currentCount < (max as number)
}

export const shouldTriggerRecurringBeatOccurrence = (
    beat: {
        readonly beat_id: string
        readonly recurrenceRule?: { readonly maxOccurrences?: number }
    },
    currentCount: number,
): boolean => canBeatFireUnderMaxOccurrences(beat, currentCount)

export const resetEventAction = async (
    cpy: EventModel,
    bal?: EventBit,
    ste?: State,
): Promise<EventModel> => {
    const fresh = new EventModel()
    for (const key of Object.keys(fresh) as Array<keyof EventModel>) {
        ;(cpy as any)[key] = (fresh as any)[key]
    }
    cpy.totalAppended = 0
    cpy.lastSequenceId = 0
    cpy.lastEventHash = '0'.repeat(64)
    await emitConsole(
        ste,
        '>> [EVENT:RESET] Append log rewound to sequence zero [OK]',
    )
    if (bal?.slv) {
        bal.slv({ evtBit: { idx: 'reset-event-pass', val: 0 } })
    }
    return cpy
}
