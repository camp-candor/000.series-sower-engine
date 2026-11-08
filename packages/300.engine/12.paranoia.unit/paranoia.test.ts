import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ParanoiaModel } from './paranoia.model.js'
import {
    initParanoia,
    tickClockAction,
    dispatchClockAction,
    decayClocksAction,
} from './buz/paranoia.buzz.js'
import { TICK_CLOCK } from './paranoia.action.js'
import { reducer } from './paranoia.reduce.js'

describe('12.paranoia.unit - Clock Dispatch Execution Battery', () => {
    let model: ParanoiaModel

    const createMockState = (initialClocks: any[] = []) => {
        const clockStore = new Map<string, any>(
            initialClocks.map((c) => [c.clock_id, c]),
        )
        const eventStore: any[] = []

        return {
            clockStore,
            eventStore,
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Query Database')) {
                    const key = payload?.dat?.key
                    if (key) {
                        const rec = clockStore.get(key)
                        return {
                            databaseBit: {
                                val: rec ? 1 : 0,
                                dat: { record: rec },
                            },
                        }
                    }
                    const list = Array.from(clockStore.values())
                    return {
                        databaseBit: {
                            val: list.length,
                            dat: { records: list },
                        },
                    }
                }
                if (actionType.includes('Exec Batch Database')) {
                    for (const op of payload.dat.operations) {
                        clockStore.set(op.key, op.record)
                    }
                    return {
                        databaseBit: { val: payload.dat.operations.length },
                    }
                }
                if (actionType.includes('Append Event')) {
                    eventStore.push(payload.dat.appendParams)
                    return { eventBit: { val: 1 } }
                }
                return {}
            }),
        }
    }

    beforeEach(() => {
        model = new ParanoiaModel()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('initializes ParanoiaModel and hydrates registered clocks from database', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_bog',
                entity_id: 'char_bog',
                clock_name: 'PARANOIA',
                value_bps: 2000,
                threshold_bps: 8000,
                decay_rate_bps: 100,
                is_triggered: 0,
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        const slv = vi.fn()

        await initParanoia(model, { idx: 'init', slv }, mockState as any)

        expect(model.clocks.size).toBe(1)
        expect(model.clocks.get('clk_bog')?.valueBps).toBe(2000)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                paranoiaBit: expect.objectContaining({ val: 1 }),
            }),
        )
    })

    it('ticks a clock, updates basis points, and triggers when crossing threshold', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_wart_panic',
                entity_id: 'char_wart',
                clock_name: 'CULVERT_PRESSURE',
                value_bps: 7000,
                threshold_bps: 8000,
                decay_rate_bps: 50,
                is_triggered: 0,
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        await initParanoia(model, { idx: 'test-init' }, mockState as any)

        const slv = vi.fn()
        await tickClockAction(
            model,
            {
                idx: 'tick-surge',
                dat: {
                    tickParams: {
                        clockId: 'clk_wart_panic',
                        deltaBps: 1500, // 7000 + 1500 = 8500 (>= 8000 threshold)
                        tick: 5,
                        timestampMs: 1700000005000,
                    },
                },
                slv,
            },
            mockState as any,
        )

        expect(slv).toHaveBeenCalled()
        const clock = model.clocks.get('clk_wart_panic')
        expect(clock?.valueBps).toBe(8500)
        expect(clock?.isTriggered).toBe(true)

        // Verify event appended to event unit
        expect(mockState.eventStore.length).toBe(1)
        expect(mockState.eventStore[0].eventType).toBe('PARANOIA_CLOCK_TICKED')
        expect(mockState.eventStore[0].payload.isTriggered).toBe(true)

        // Verify database persistence
        const dbClock = mockState.clockStore.get('clk_wart_panic')
        expect(dbClock.value_bps).toBe(8500)
        expect(dbClock.is_triggered).toBe(1)
    })

    it('rejects floating-point numbers in tick delta with FLOAT_PROHIBITED', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_test',
                entity_id: 'char_bog',
                clock_name: 'PRESSURE',
                value_bps: 1000,
                threshold_bps: 5000,
                decay_rate_bps: 10,
                is_triggered: 0,
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        await initParanoia(model, { idx: 'test-init' }, mockState as any)

        const slv = vi.fn()
        await tickClockAction(
            model,
            {
                idx: 'tick-float',
                dat: {
                    tickParams: {
                        clockId: 'clk_test',
                        deltaBps: 250.75, // Fractional float violation
                        tick: 1,
                        timestampMs: 1700000001000,
                    },
                },
                slv,
            },
            mockState as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                paranoiaBit: expect.objectContaining({
                    val: 0,
                    idx: 'tick-clock-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining('FLOAT_PROHIBITED'),
                    }),
                }),
            }),
        )
    })

    it('executes dramatic clock dispatch, discharges pressure, and resets is_triggered', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_confront',
                entity_id: 'char_bog',
                clock_name: 'ACCUSATION_PRESSURE',
                value_bps: 8500,
                threshold_bps: 8000,
                decay_rate_bps: 20,
                is_triggered: 1, // Already crossed threshold
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        await initParanoia(model, { idx: 'test-init' }, mockState as any)

        const slv = vi.fn()
        await dispatchClockAction(
            model,
            {
                idx: 'dispatch',
                dat: {
                    dispatchTrigger: {
                        clockId: 'clk_confront',
                        entityId: 'char_bog',
                        dispatchType: 'CONFRONTATION',
                        dischargeBps: 5000, // Deduct 5000 bps post-discharge
                        tick: 6,
                        timestampMs: 1700000006000,
                        narrativeContext:
                            'Bog violently confronts Wart over missing siphon hose',
                    },
                },
                slv,
            },
            mockState as any,
        )

        expect(slv).toHaveBeenCalled()
        const clock = model.clocks.get('clk_confront')
        expect(clock?.valueBps).toBe(3500) // 8500 - 5000 = 3500 bps
        expect(clock?.isTriggered).toBe(false)
        expect(model.activeDispatchCount).toBe(1)
        expect(model.lastDispatchedClockId).toBe('clk_confront')

        // Verify database updated
        const dbClock = mockState.clockStore.get('clk_confront')
        expect(dbClock.value_bps).toBe(3500)
        expect(dbClock.is_triggered).toBe(0)
    })

    it('rejects dispatch attempts against un-triggered clocks with PREMATURE_DISPATCH', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_calm',
                entity_id: 'char_wart',
                clock_name: 'CALM_CLOCK',
                value_bps: 2000,
                threshold_bps: 8000,
                decay_rate_bps: 50,
                is_triggered: 0,
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        await initParanoia(model, { idx: 'test-init' }, mockState as any)

        const slv = vi.fn()
        await dispatchClockAction(
            model,
            {
                idx: 'premature-dispatch',
                dat: {
                    dispatchTrigger: {
                        clockId: 'clk_calm',
                        entityId: 'char_wart',
                        dispatchType: 'PANIC_FLIGHT',
                        dischargeBps: 1000,
                        tick: 2,
                        timestampMs: 1700000002000,
                        narrativeContext: 'Premature panic',
                    },
                },
                slv,
            },
            mockState as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                paranoiaBit: expect.objectContaining({
                    val: 0,
                    idx: 'dispatch-clock-fail',
                    dat: expect.objectContaining({
                        error: expect.stringContaining('PREMATURE_DISPATCH'),
                    }),
                }),
            }),
        )
    })

    it('decays active clocks without falling below 0 basis points', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_decay_1',
                entity_id: 'char_bog',
                clock_name: 'TEST_DECAY',
                value_bps: 80,
                threshold_bps: 5000,
                decay_rate_bps: 100, // 80 - 100 would be negative -> clamps to 0
                is_triggered: 0,
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        await initParanoia(model, { idx: 'test-init' }, mockState as any)

        const slv = vi.fn()
        await decayClocksAction(
            model,
            {
                idx: 'decay',
                dat: {
                    tickParams: {
                        clockId: '',
                        deltaBps: 0,
                        tick: 1,
                        timestampMs: 1700000001000,
                    },
                },
                slv,
            },
            mockState as any,
        )

        expect(slv).toHaveBeenCalled()
        const clock = model.clocks.get('clk_decay_1')
        expect(clock?.valueBps).toBe(0)
    })

    it('routes actions cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: TICK_CLOCK,
                bale: {
                    idx: 'test-reducer',
                    dat: {
                        tickParams: {
                            clockId: 'non_existent',
                            deltaBps: 100,
                            tick: 1,
                            timestampMs: 1700000000000,
                        },
                    },
                    slv,
                } as any,
            },
            {} as any,
        )) as ParanoiaModel

        expect(result).toBeInstanceOf(ParanoiaModel)
        expect(slv).toHaveBeenCalled()
    })
})
