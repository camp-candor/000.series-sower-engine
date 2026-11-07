/**
 * 12.paranoia.unit - Paranoia Buzz Business Logic
 * Fixed-point clock tick evaluation, threshold dispatching, pressure discharge, and natural decay.
 */
import { ParanoiaModel } from '../paranoia.model.js'
import type ParanoiaBit from '../fce/paranoia.bit.js'
import type {
    ParanoiaClockState,
    ClockTickParams,
    ClockDispatchTrigger,
    ClockDispatchResult,
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

export const initParanoia = async (
    cpy: ParanoiaModel,
    bal?: ParanoiaBit,
    ste?: State,
): Promise<ParanoiaModel> => {
    cpy.clocks.clear()
    cpy.activeDispatchCount = 0
    cpy.lastDispatchedClockId = ''

    // Hydrate active clocks from 02.database.unit if available
    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'paranoia_clocks' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            for (const rec of queryRes.databaseBit.dat.records as ParanoiaClockRecord[]) {
                cpy.clocks.set(rec.clock_id, {
                    clockId: rec.clock_id,
                    entityId: rec.entity_id,
                    clockName: rec.clock_name,
                    valueBps: rec.value_bps,
                    thresholdBps: rec.threshold_bps,
                    decayRateBps: rec.decay_rate_bps,
                    isTriggered: rec.is_triggered === 1,
                    lastTickedAtMs: rec.updated_at_ms,
                })
            }
        }
    }

    await emitConsole(
        ste,
        `>> [PARANOIA:INIT] [OK] Paranoia clock manager online with ${cpy.clocks.size} clocks hydrated.`,
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

        // If not in local model, attempt to query from 02.database.unit
        if (!existing && ste && typeof ste.hunt === 'function') {
            const dbRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
                dat: { table: 'paranoia_clocks', key: params.clockId },
            })
            if (dbRes?.databaseBit?.val === 1 && dbRes?.databaseBit?.dat?.record) {
                const rec = dbRes.databaseBit.dat.record as ParanoiaClockRecord
                existing = {
                    clockId: rec.clock_id,
                    entityId: rec.entity_id,
                    clockName: rec.clock_name,
                    valueBps: rec.value_bps,
                    thresholdBps: rec.threshold_bps,
                    decayRateBps: rec.decay_rate_bps,
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
        const isTriggered = clampedValue >= existing.thresholdBps

        const updatedClock: ParanoiaClockState = {
            ...existing,
            valueBps: clampedValue,
            isTriggered,
            lastTickedAtMs: params.timestampMs,
        }

        cpy.clocks.set(params.clockId, updatedClock)

        // Persist update to 02.database.unit
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

            // Dispatch event envelope via 05.event.unit
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
                            isTriggered: updatedClock.isTriggered,
                        },
                    },
                },
            })
        }

        await emitConsole(
            ste,
            `>> [CLOCK:TICK] [${updatedClock.clockId}] (${updatedClock.clockName}): ${existing.valueBps} -> ${updatedClock.valueBps} bps | Threshold: ${updatedClock.thresholdBps} ${isTriggered ? '[TRIGGERED]' : '[OK]'}`,
        )

        if (bal.slv) {
            bal.slv({
                clock: updatedClock,
                paranoiaBit: {
                    idx: 'tick-clock-pass',
                    val: updatedClock.valueBps,
                    src: isTriggered ? 'TRIGGERED' : 'ACTIVE',
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
                clock = {
                    clockId: rec.clock_id,
                    entityId: rec.entity_id,
                    clockName: rec.clock_name,
                    valueBps: rec.value_bps,
                    thresholdBps: rec.threshold_bps,
                    decayRateBps: rec.decay_rate_bps,
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

        const updatedClock: ParanoiaClockState = {
            ...clock,
            valueBps: postValue,
            isTriggered: false, // Discharged
            lastDispatchedAtMs: trigger.timestampMs,
            lastTickedAtMs: trigger.timestampMs,
        }

        cpy.clocks.set(trigger.clockId, updatedClock)
        cpy.activeDispatchCount += 1
        cpy.lastDispatchedClockId = trigger.clockId

        const dispatchEventId = `evt_dispatch_${clock.clockId}_${trigger.tick}`

        // Update database record
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

            // Commit dramatic confrontation / dispatch event envelope to 05.event.unit
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
    let decayedCount = 0
    const nowMs = bal.dat?.tickParams?.timestampMs || 1700000000000

    try {
        const operations = []

        for (const [id, clock] of cpy.clocks.entries()) {
            if (clock.decayRateBps > 0 && clock.valueBps > 0) {
                const newValue = Math.max(0, clock.valueBps - clock.decayRateBps)
                const isTriggered = newValue >= clock.thresholdBps

                const updatedClock: ParanoiaClockState = {
                    ...clock,
                    valueBps: newValue,
                    isTriggered,
                    lastTickedAtMs: nowMs,
                }
                cpy.clocks.set(id, updatedClock)
                decayedCount++

                const dbRecord: ParanoiaClockRecord = {
                    clock_id: updatedClock.clockId,
                    entity_id: updatedClock.entityId,
                    clock_name: updatedClock.clockName,
                    value_bps: updatedClock.valueBps,
                    threshold_bps: updatedClock.thresholdBps,
                    decay_rate_bps: updatedClock.decayRateBps,
                    is_triggered: updatedClock.isTriggered ? 1 : 0,
                    updated_at_ms: nowMs,
                }

                operations.push({
                    table: 'paranoia_clocks' as const,
                    action: 'UPDATE' as const,
                    key: dbRecord.clock_id,
                    record: dbRecord,
                })
            }
        }

        if (operations.length > 0 && ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: { operations },
            })
        }

        await emitConsole(
            ste,
            `>> [CLOCK:DECAY] [OK] Natural decay applied across ${decayedCount} active clocks without floor breaches.`,
        )

        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'decay-clocks-pass',
                    val: decayedCount,
                    dat: { rowCount: decayedCount },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Clock decay aborted: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                paranoiaBit: {
                    idx: 'decay-clocks-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
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
                },
            })
        }
    }
    return cpy
}

