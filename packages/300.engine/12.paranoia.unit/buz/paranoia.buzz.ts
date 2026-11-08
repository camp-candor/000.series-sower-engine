/**
 * 12.paranoia.unit - Paranoia Buzz Business Logic
 * Thermodynamic pressure monitoring, dissipation flow, and multi-stage tripwire cascading.
 */
import { ParanoiaModel } from '../paranoia.model.js'
import type ParanoiaBit from '../fce/paranoia.bit.js'
import type {
    ParanoiaClockState,
    ClockTickParams,

    ThermodynamicFlowReceipt,
    ThermodynamicAuditReport,
    ClockDispatchTrigger,
    ClockDispatchResult,
    TripwirePhase,
} from '../fce/paranoia.interface.js'
import type { ParanoiaClockRecord } from '../../02.database.unit/fce/database.interface.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActEvt from '../../05.event.unit/event.action.js'
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

export function assertBasisPoints(val: number, field: string): void {
    if (!Number.isInteger(val)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] ${field} must be a discrete integer. Received: ${val}`,
        )
    }
    if (val < 0 || val > 10000) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${field} out of bounds [0, 10000]: ${val}`,
        )
    }
}

export function deriveTripwirePhase(
    valueBps: number,
    thresholdBps: number,
): { phase: TripwirePhase; visionConeDegrees: number } {
    if (valueBps >= thresholdBps || valueBps >= 8000) {
        return { phase: 'CRITICAL_OVERDRIVE', visionConeDegrees: 60 }
    }
    if (valueBps >= 6666) {
        return { phase: 'HYPERVIGILANT', visionConeDegrees: 60 }
    }
    if (valueBps >= 3333) {
        return { phase: 'FIDGET', visionConeDegrees: 180 }
    }
    return { phase: 'CALM', visionConeDegrees: 360 }
}

export function calculateCurrentSegment(
    valueBps: number,
    segmentsCount: number = 6,
): number {
    const bpsPerSegment = Math.floor(10000 / segmentsCount)
    return Math.min(segmentsCount, Math.floor(valueBps / bpsPerSegment))
}

export const initParanoia = async (
    cpy: ParanoiaModel,
    bal?: ParanoiaBit,
    ste?: State,
): Promise<ParanoiaModel> => {
    cpy.clocks.clear()
    cpy.activeDispatchCount = 0
    cpy.lastDispatchedClockId = ''

    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'paranoia_clocks' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            for (const rec of queryRes.databaseBit.dat.records as ParanoiaClockRecord[]) {
                const { phase, visionConeDegrees } = deriveTripwirePhase(
                    rec.value_bps,
                    rec.threshold_bps,
                )
                cpy.clocks.set(rec.clock_id, {
                    clockId: rec.clock_id,
                    entityId: rec.entity_id,
                    clockName: rec.clock_name,
                    valueBps: rec.value_bps,
                    thresholdBps: rec.threshold_bps,
                    decayRateBps: rec.decay_rate_bps,
                    segmentsCount: 6,
                    currentSegment: calculateCurrentSegment(rec.value_bps, 6),
                    tripwirePhase: phase,
                    visionConeDegrees,
                    isTriggered: rec.is_triggered === 1,
                    lastTickedAtMs: rec.updated_at_ms,
                })
            }
        }
    }

    await emitConsole(
        ste,
        `>> [PARANOIA:INIT] [OK] Thermodynamic paranoia monitor online with ${cpy.clocks.size} clocks hydrated.`,
    )

    if (bal?.slv) {
        bal.slv({
            paranoiaBit: {
                idx: 'init-paranoia-pass',
                val: cpy.clocks.size,
                dat: { rowCount: cpy.clocks.size },
            },
        })
    }
    return cpy
}

export const updateParanoia = (
    cpy: ParanoiaModel,
    bal?: ParanoiaBit,
    _ste?: State,
): ParanoiaModel => {
    if (bal?.slv) {
        bal.slv({
            paranoiaBit: {
                idx: 'update-paranoia-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const tickClockAction = async (
    cpy: ParanoiaModel,
    bal: ParanoiaBit,
    ste?: State,
): Promise<ParanoiaModel> => {
    const params: ClockTickParams | undefined = bal.dat?.tickParams
    if (!params || !params.clockId) {
        const errorMsg = '[INVALID_TICK_PARAMS] Missing required clockId or tickParams'
        await emitConsole(ste, `:: [FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'tick-clock-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
        return cpy
    }

    try {
        if (!Number.isInteger(params.deltaBps)) {
            throw new TypeError(
                `[FLOAT_PROHIBITED] deltaBps must be a discrete integer. Received: ${params.deltaBps}`,
            )
        }

        let existing = cpy.clocks.get(params.clockId)
        if (!existing && ste && typeof ste.hunt === 'function') {
            const dbRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
                dat: { table: 'paranoia_clocks', key: params.clockId },
            })
            if (dbRes?.databaseBit?.val === 1 && dbRes?.databaseBit?.dat?.record) {
                const rec = dbRes.databaseBit.dat.record as ParanoiaClockRecord
                const { phase, visionConeDegrees } = deriveTripwirePhase(
                    rec.value_bps,
                    rec.threshold_bps,
                )
                existing = {
                    clockId: rec.clock_id,
                    entityId: rec.entity_id,
                    clockName: rec.clock_name,
                    valueBps: rec.value_bps,
                    thresholdBps: rec.threshold_bps,
                    decayRateBps: rec.decay_rate_bps,
                    segmentsCount: 6,
                    currentSegment: calculateCurrentSegment(rec.value_bps, 6),
                    tripwirePhase: phase,
                    visionConeDegrees,
                    isTriggered: rec.is_triggered === 1,
                    lastTickedAtMs: rec.updated_at_ms,
                }
            }
        }

        if (!existing) {
            throw new Error(`[CLOCK_NOT_FOUND] Clock '${params.clockId}' does not exist`)
        }

        const rawNewValue = existing.valueBps + params.deltaBps
        const clampedValue = Math.max(0, Math.min(10000, rawNewValue))
        const { phase, visionConeDegrees } = deriveTripwirePhase(
            clampedValue,
            existing.thresholdBps,
        )
        const isTriggered = clampedValue >= existing.thresholdBps

        const updatedClock: ParanoiaClockState = {
            ...existing,
            valueBps: clampedValue,
            currentSegment: calculateCurrentSegment(clampedValue, existing.segmentsCount),
            tripwirePhase: phase,
            visionConeDegrees,
            isTriggered,
            lastTickedAtMs: params.timestampMs,
        }

        cpy.clocks.set(params.clockId, updatedClock)

        const dbRecord: ParanoiaClockRecord = {
            clock_id: updatedClock.clockId,
            entity_id: updatedClock.entityId,
            clock_name: updatedClock.clockName,
            value_bps: updatedClock.valueBps,
            threshold_bps: updatedClock.thresholdBps,
            decay_rate_bps: updatedClock.decayRateBps,
            is_triggered: updatedClock.isTriggered ? 1 : 0,
            updated_at_ms: updatedClock.lastTickedAtMs,
        }

        if (ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: {
                    operations: [
                        {
                            table: 'paranoia_clocks',
                            action: 'UPDATE',
                            key: dbRecord.clock_id,
                            record: dbRecord,
                        },
                    ],
                },
            })

            await ste.hunt(ActEvt.APPEND_EVENT, {
                dat: {
                    appendParams: {
                        eventId: `evt_clock_${updatedClock.clockId}_${params.tick}`,
                        eventType: 'PARANOIA_CLOCK_TICKED',
                        tick: params.tick,
                        payload: {
                            clockId: updatedClock.clockId,
                            entityId: updatedClock.entityId,
                            clockName: updatedClock.clockName,
                            deltaBps: params.deltaBps,
                            valueBps: updatedClock.valueBps,
                            thresholdBps: updatedClock.thresholdBps,
                            tripwirePhase: updatedClock.tripwirePhase,
                            isTriggered: updatedClock.isTriggered,
                        },
                    },
                },
            })
        }

        await emitConsole(
            ste,
            `>> [CLOCK:TICK] [${updatedClock.clockId}] (${updatedClock.clockName}): ${existing.valueBps} -> ${updatedClock.valueBps} bps | Phase: [${phase}] ${isTriggered ? '[TRIGGERED]' : '[OK]'}`,
        )

        if (bal.slv) {
            bal.slv({
                clock: updatedClock,
                paranoiaBit: {
                    idx: 'tick-clock-pass',
                    val: updatedClock.valueBps,
                    src: isTriggered ? 'TRIGGERED' : phase,
                    dat: { clock: updatedClock, isTriggered },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Clock tick aborted: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'tick-clock-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const applyThermodynamicImpulseAction = async (
    cpy: ParanoiaModel,
    bal: ParanoiaBit,
    ste?: State,
): Promise<ParanoiaModel> => {
    const impulse = bal.dat?.impulseParams
    if (!impulse || !impulse.clockId) {
        const err = '[INVALID_IMPULSE_PARAMS] Missing impulseParams or clockId'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'apply-impulse-fail',
                    val: 0,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        assertBasisPoints(impulse.impulseBps, 'impulseBps')

        let clock = cpy.clocks.get(impulse.clockId)
        if (!clock && ste && typeof ste.hunt === 'function') {
            const dbRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
                dat: { table: 'paranoia_clocks', key: impulse.clockId },
            })
            if (dbRes?.databaseBit?.val === 1 && dbRes?.databaseBit?.dat?.record) {
                const rec = dbRes.databaseBit.dat.record as ParanoiaClockRecord
                const { phase, visionConeDegrees } = deriveTripwirePhase(
                    rec.value_bps,
                    rec.threshold_bps,
                )
                clock = {
                    clockId: rec.clock_id,
                    entityId: rec.entity_id,
                    clockName: rec.clock_name,
                    valueBps: rec.value_bps,
                    thresholdBps: rec.threshold_bps,
                    decayRateBps: rec.decay_rate_bps,
                    segmentsCount: 6,
                    currentSegment: calculateCurrentSegment(rec.value_bps, 6),
                    tripwirePhase: phase,
                    visionConeDegrees,
                    isTriggered: rec.is_triggered === 1,
                    lastTickedAtMs: rec.updated_at_ms,
                }
            }
        }

        if (!clock) {
            throw new Error(`[CLOCK_NOT_FOUND] Clock '${impulse.clockId}' not registered`)
        }

        const prevValue = clock.valueBps
        const nextValue = Math.min(10000, prevValue + impulse.impulseBps)
        const { phase, visionConeDegrees } = deriveTripwirePhase(
            nextValue,
            clock.thresholdBps,
        )
        const isTriggered = nextValue >= clock.thresholdBps

        const updated: ParanoiaClockState = {
            ...clock,
            valueBps: nextValue,
            currentSegment: calculateCurrentSegment(nextValue, clock.segmentsCount),
            tripwirePhase: phase,
            visionConeDegrees,
            isTriggered,
            lastTickedAtMs: impulse.timestampMs,
        }

        cpy.clocks.set(impulse.clockId, updated)

        const receipt: ThermodynamicFlowReceipt = {
            clockId: impulse.clockId,
            entityId: clock.entityId,
            prevValueBps: prevValue,
            nextValueBps: nextValue,
            dissipatedBps: 0,
            tripwirePhase: phase,
            isOverdrive: phase === 'CRITICAL_OVERDRIVE',
            timestampMs: impulse.timestampMs,
        }

        if (ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: {
                    operations: [
                        {
                            table: 'paranoia_clocks',
                            action: 'UPDATE',
                            key: updated.clockId,
                            record: {
                                clock_id: updated.clockId,
                                entity_id: updated.entityId,
                                clock_name: updated.clockName,
                                value_bps: updated.valueBps,
                                threshold_bps: updated.thresholdBps,
                                decay_rate_bps: updated.decayRateBps,
                                is_triggered: isTriggered ? 1 : 0,
                                updated_at_ms: impulse.timestampMs,
                            },
                        },
                    ],
                },
            })

            await ste.hunt(ActEvt.APPEND_EVENT, {
                dat: {
                    appendParams: {
                        eventId: `evt_impulse_${updated.clockId}_${impulse.tick}`,
                        eventType: 'PARANOIA_CLOCK_TICKED',
                        tick: impulse.tick,
                        payload: {
                            clockId: updated.clockId,
                            impulseBps: impulse.impulseBps,
                            nextValueBps: nextValue,
                            tripwirePhase: phase,
                            visionConeDegrees,
                        },
                    },
                },
            })
        }

        await emitConsole(
            ste,
            `>> [THERMODYNAMIC_FLOW] ${clock.clockName}:${updated.clockId} | ${prevValue} -> ${nextValue} bps | Phase: [${phase}] | Vision: ${visionConeDegrees} deg [OK]`,
        )

        if (bal.slv) {
            bal.slv({
                flowReceipt: receipt,
                clock: updated,
                paranoiaBit: {
                    idx: 'apply-impulse-pass',
                    val: nextValue,
                    src: phase,
                    dat: { flowReceipt: receipt, clock: updated },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Thermodynamic impulse failed: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'apply-impulse-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const sweepThermodynamicsAction = async (
    cpy: ParanoiaModel,
    bal: ParanoiaBit,
    ste?: State,
): Promise<ParanoiaModel> => {
    const nowMs = bal.dat?.timestampMs || 1700000000000
    const receipts: ThermodynamicFlowReceipt[] = []
    const dbOperations = []

    for (const [id, clock] of cpy.clocks.entries()) {
        const prevValue = clock.valueBps
        let dissipated = 0

        if (clock.decayRateBps > 0 && clock.valueBps > 0) {
            dissipated = Math.min(clock.valueBps, clock.decayRateBps)
        }

        const nextValue = Math.max(0, prevValue - dissipated)
        const { phase, visionConeDegrees } = deriveTripwirePhase(
            nextValue,
            clock.thresholdBps,
        )
        const isTriggered = nextValue >= clock.thresholdBps

        const updated: ParanoiaClockState = {
            ...clock,
            valueBps: nextValue,
            currentSegment: calculateCurrentSegment(nextValue, clock.segmentsCount),
            tripwirePhase: phase,
            visionConeDegrees,
            isTriggered,
            lastTickedAtMs: nowMs,
        }

        cpy.clocks.set(id, updated)

        receipts.push({
            clockId: id,
            entityId: clock.entityId,
            prevValueBps: prevValue,
            nextValueBps: nextValue,
            dissipatedBps: dissipated,
            tripwirePhase: phase,
            isOverdrive: phase === 'CRITICAL_OVERDRIVE',
            timestampMs: nowMs,
        })

        dbOperations.push({
            table: 'paranoia_clocks' as const,
            action: 'UPDATE' as const,
            key: id,
            record: {
                clock_id: id,
                entity_id: updated.entityId,
                clock_name: updated.clockName,
                value_bps: nextValue,
                threshold_bps: updated.thresholdBps,
                decay_rate_bps: updated.decayRateBps,
                is_triggered: isTriggered ? 1 : 0,
                updated_at_ms: nowMs,
            },
        })
    }

    if (dbOperations.length > 0 && ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: { operations: dbOperations },
        })
    }

    await emitConsole(
        ste,
        `>> [THERMODYNAMIC_FLOW] Swept ${receipts.length} clocks. Dissipation applied cleanly across all active meters.`,
    )

    if (bal.slv) {
        bal.slv({
            flowReceipts: receipts,
            paranoiaBit: {
                idx: 'sweep-thermodynamics-pass',
                val: receipts.length,
                dat: { flowReceipts: receipts, rowCount: receipts.length },
            },
        })
    }

    return cpy
}

export const auditThermodynamicsAction = async (
    cpy: ParanoiaModel,
    bal: ParanoiaBit | any,
    ste?: State,
): Promise<ParanoiaModel> => {
    let totalHeat = 0
    let overdriveCount = 0
    let hypervigilantCount = 0

    for (const clock of cpy.clocks.values()) {
        totalHeat += clock.valueBps
        if (clock.tripwirePhase === 'CRITICAL_OVERDRIVE') {
            overdriveCount++
        } else if (clock.tripwirePhase === 'HYPERVIGILANT') {
            hypervigilantCount++
        }
    }

    const count = cpy.clocks.size
    const averageStrain = count > 0 ? Math.floor(totalHeat / count) : 0

    const report: ThermodynamicAuditReport = {
        valid: true,
        totalClocks: count,
        totalSystemHeatBps: totalHeat,
        averageStrainBps: averageStrain,
        criticalOverdriveCount: overdriveCount,
        hypervigilantCount,
        timestampMs: 1700000000000,
    }

    await emitConsole(
        ste,
        `>> [THERMODYNAMICS:AUDIT] Clocks: ${count} | Total Heat: ${totalHeat} bps | Avg: ${averageStrain} bps | Overdrive: ${overdriveCount}`,
    )

    if (bal?.slv) {
        bal.slv({
            auditReport: report,
            paranoiaBit: {
                idx: 'audit-thermodynamics-pass',
                val: totalHeat,
                dat: { auditReport: report },
            },
        })
    }

    return cpy
}

export const dispatchClockAction = async (
    cpy: ParanoiaModel,
    bal: ParanoiaBit,
    ste?: State,
): Promise<ParanoiaModel> => {
    const trigger: ClockDispatchTrigger | undefined = bal.dat?.dispatchTrigger
    if (!trigger || !trigger.clockId) {
        const errorMsg = '[INVALID_DISPATCH_TRIGGER] Missing dispatch trigger specification'
        await emitConsole(ste, `:: [FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'dispatch-clock-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
        return cpy
    }

    try {
        assertBasisPoints(trigger.dischargeBps, 'dispatchTrigger.dischargeBps')

        let clock = cpy.clocks.get(trigger.clockId)
        if (!clock && ste && typeof ste.hunt === 'function') {
            const dbRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
                dat: { table: 'paranoia_clocks', key: trigger.clockId },
            })
            if (dbRes?.databaseBit?.val === 1 && dbRes?.databaseBit?.dat?.record) {
                const rec = dbRes.databaseBit.dat.record as ParanoiaClockRecord
                const { phase, visionConeDegrees } = deriveTripwirePhase(
                    rec.value_bps,
                    rec.threshold_bps,
                )
                clock = {
                    clockId: rec.clock_id,
                    entityId: rec.entity_id,
                    clockName: rec.clock_name,
                    valueBps: rec.value_bps,
                    thresholdBps: rec.threshold_bps,
                    decayRateBps: rec.decay_rate_bps,
                    segmentsCount: 6,
                    currentSegment: calculateCurrentSegment(rec.value_bps, 6),
                    tripwirePhase: phase,
                    visionConeDegrees,
                    isTriggered: rec.is_triggered === 1,
                    lastTickedAtMs: rec.updated_at_ms,
                }
            }
        }

        if (!clock) {
            throw new Error(`[CLOCK_NOT_FOUND] Clock '${trigger.clockId}' not registered`)
        }

        if (!clock.isTriggered && clock.valueBps < clock.thresholdBps) {
            throw new Error(
                `[PREMATURE_DISPATCH] Clock '${clock.clockId}' has not met threshold ${clock.thresholdBps} bps (Current: ${clock.valueBps} bps)`,
            )
        }

        const preValue = clock.valueBps
        const postValue = Math.max(0, preValue - trigger.dischargeBps)
        const { phase, visionConeDegrees } = deriveTripwirePhase(
            postValue,
            clock.thresholdBps,
        )

        const updatedClock: ParanoiaClockState = {
            ...clock,
            valueBps: postValue,
            currentSegment: calculateCurrentSegment(postValue, clock.segmentsCount),
            tripwirePhase: phase,
            visionConeDegrees,
            isTriggered: false,
            lastDispatchedAtMs: trigger.timestampMs,
            lastTickedAtMs: trigger.timestampMs,
        }

        cpy.clocks.set(trigger.clockId, updatedClock)
        cpy.activeDispatchCount += 1
        cpy.lastDispatchedClockId = trigger.clockId

        const dispatchEventId = `evt_dispatch_${clock.clockId}_${trigger.tick}`

        const dbRecord: ParanoiaClockRecord = {
            clock_id: updatedClock.clockId,
            entity_id: updatedClock.entityId,
            clock_name: updatedClock.clockName,
            value_bps: updatedClock.valueBps,
            threshold_bps: updatedClock.thresholdBps,
            decay_rate_bps: updatedClock.decayRateBps,
            is_triggered: 0,
            updated_at_ms: updatedClock.lastTickedAtMs,
        }

        if (ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: {
                    operations: [
                        {
                            table: 'paranoia_clocks',
                            action: 'UPDATE',
                            key: dbRecord.clock_id,
                            record: dbRecord,
                        },
                    ],
                },
            })

            await ste.hunt(ActEvt.APPEND_EVENT, {
                dat: {
                    appendParams: {
                        eventId: dispatchEventId,
                        eventType: 'PARANOIA_CLOCK_TICKED',
                        tick: trigger.tick,
                        payload: {
                            clockId: updatedClock.clockId,
                            entityId: updatedClock.entityId,
                            clockName: updatedClock.clockName,
                            dispatchType: trigger.dispatchType,
                            narrativeContext: trigger.narrativeContext,
                            deltaBps: -trigger.dischargeBps,
                            valueBps: updatedClock.valueBps,
                            thresholdBps: updatedClock.thresholdBps,
                            isTriggered: false,
                        },
                    },
                },
            })
        }

        const result: ClockDispatchResult = {
            dispatched: true,
            clockId: trigger.clockId,
            entityId: trigger.entityId,
            dispatchType: trigger.dispatchType,
            preDispatchValueBps: preValue,
            postDispatchValueBps: postValue,
            isTriggered: false,
            eventId: dispatchEventId,
            timestampMs: trigger.timestampMs,
        }

        await emitConsole(
            ste,
            `>> [CLOCK:DISPATCH] [OK] Clock '${clock.clockId}' triggered ${trigger.dispatchType}! Pressure discharged: ${preValue} -> ${postValue} bps`,
        )

        if (bal.slv) {
            bal.slv({
                dispatchResult: result,
                paranoiaBit: {
                    idx: 'dispatch-clock-pass',
                    val: postValue,
                    src: trigger.dispatchType,
                    dat: { dispatchResult: result },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Clock dispatch aborted: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'dispatch-clock-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const decayClocksAction = async (
    cpy: ParanoiaModel,
    bal: ParanoiaBit,
    ste?: State,
): Promise<ParanoiaModel> => {
    return sweepThermodynamicsAction(cpy, bal, ste)
}

export const queryClockStateAction = (
    cpy: ParanoiaModel,
    bal: ParanoiaBit,
    _ste?: State,
): ParanoiaModel => {
    const clockId = bal.dat?.clockId || bal.src
    if (clockId) {
        const clock = cpy.clocks.get(clockId)
        if (bal.slv) {
            bal.slv({
                clock,
                paranoiaBit: {
                    idx: clock ? 'query-clock-pass' : 'query-clock-not-found',
                    val: clock ? clock.valueBps : 0,
                    dat: { clock },
                },
            })
        }
    } else {
        const list = Array.from(cpy.clocks.values())
        if (bal.slv) {
            bal.slv({
                clocks: list,
                paranoiaBit: {
                    idx: 'query-clock-pass',
                    val: list.length,
                    dat: { clocks: list, rowCount: list.length },
                    lst: list,
                },
            })
        }
    }
    return cpy
}
