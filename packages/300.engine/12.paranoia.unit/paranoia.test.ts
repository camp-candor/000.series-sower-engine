import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ParanoiaModel } from './paranoia.model.js'
import {
    initParanoia,
    applyThermodynamicImpulseAction,
    sweepThermodynamicsAction,
    auditThermodynamicsAction,
    deriveTripwirePhase,
    calculateCurrentSegment,
} from './buz/paranoia.buzz.js'
import { APPLY_THERMODYNAMIC_IMPULSE } from './paranoia.action.js'
import { reducer } from './paranoia.reduce.js'

describe('12.paranoia.unit - Thermodynamic Paranoia Monitoring Battery', () => {
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

    it('derives multi-stage tripwire phase and vision cone narrowing correctly', () => {
        // Calm: 0 to 3332 bps
        expect(deriveTripwirePhase(2000, 8000)).toEqual({
            phase: 'CALM',
            visionConeDegrees: 360,
        })
        // Fidget: 3333 to 6665 bps
        expect(deriveTripwirePhase(4500, 8000)).toEqual({
            phase: 'FIDGET',
            visionConeDegrees: 180,
        })
        // Hypervigilant: 6666 to 7999 bps (vision cone narrows to 60 deg)
        expect(deriveTripwirePhase(7200, 8000)).toEqual({
            phase: 'HYPERVIGILANT',
            visionConeDegrees: 60,
        })
        // Critical Overdrive: >= 8000 bps
        expect(deriveTripwirePhase(8500, 8000)).toEqual({
            phase: 'CRITICAL_OVERDRIVE',
            visionConeDegrees: 60,
        })
    })

    it('calculates 6-segment clock segments accurately', () => {
        expect(calculateCurrentSegment(0, 6)).toBe(0)
        expect(calculateCurrentSegment(1666, 6)).toBe(1)
        expect(calculateCurrentSegment(3333, 6)).toBe(2)
        expect(calculateCurrentSegment(5000, 6)).toBe(3)
        expect(calculateCurrentSegment(6666, 6)).toBe(4)
        expect(calculateCurrentSegment(8333, 6)).toBe(5)
        expect(calculateCurrentSegment(10000, 6)).toBe(6)
    })

    it('applies thermodynamic impulse and escalates tripwire phase to HYPERVIGILANT', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_bog_acoustic',
                entity_id: 'char_bog',
                clock_name: 'ACOUSTIC_STRAIN',
                value_bps: 5500,
                threshold_bps: 8000,
                decay_rate_bps: 200,
                is_triggered: 0,
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        await initParanoia(model, { idx: 'init' }, mockState as any)

        const slv = vi.fn()
        // Impulse +1500 bps: 5500 -> 7000 bps (crosses into HYPERVIGILANT)
        await applyThermodynamicImpulseAction(
            model,
            {
                idx: 'impulse',
                dat: {
                    impulseParams: {
                        clockId: 'clk_bog_acoustic',
                        impulseBps: 1500,
                        tick: 5,
                        timestampMs: 1700000005000,
                    },
                },
                slv,
            },
            mockState as any,
        )

        expect(slv).toHaveBeenCalled()
        const clock = model.clocks.get('clk_bog_acoustic')!
        expect(clock.valueBps).toBe(7000)
        expect(clock.tripwirePhase).toBe('HYPERVIGILANT')
        expect(clock.visionConeDegrees).toBe(60)

        const receipt = slv.mock.calls[0][0].flowReceipt
        expect(receipt.prevValueBps).toBe(5500)
        expect(receipt.nextValueBps).toBe(7000)
        expect(receipt.tripwirePhase).toBe('HYPERVIGILANT')
    })

    it('dissipates heat during thermodynamic sweep without falling below 0 basis points', async () => {
        const mockClocks = [
            {
                clock_id: 'clk_wart_dissipate',
                entity_id: 'char_wart',
                clock_name: 'DISSIPATION_METER',
                value_bps: 150,
                threshold_bps: 8000,
                decay_rate_bps: 300, // 150 - 300 -> clamps to 0
                is_triggered: 0,
                updated_at_ms: 1700000000000,
            },
        ]
        const mockState = createMockState(mockClocks)
        await initParanoia(model, { idx: 'init' }, mockState as any)

        const slv = vi.fn()
        await sweepThermodynamicsAction(
            model,
            { idx: 'sweep', dat: { timestampMs: 1700000001000 }, slv },
            mockState as any,
        )

        expect(slv).toHaveBeenCalled()
        const clock = model.clocks.get('clk_wart_dissipate')!
        expect(clock.valueBps).toBe(0)
        expect(clock.tripwirePhase).toBe('CALM')
        expect(clock.visionConeDegrees).toBe(360)

        const receipts = slv.mock.calls[0][0].flowReceipts
        expect(receipts[0].dissipatedBps).toBe(150)
        expect(receipts[0].nextValueBps).toBe(0)
    })

    it('audits total system heat and reports boil-over and hypervigilant counts', async () => {
        model.clocks.set('c1', {
            clockId: 'c1',
            entityId: 'e1',
            clockName: 'MTR1',
            valueBps: 8500,
            thresholdBps: 8000,
            decayRateBps: 100,
            segmentsCount: 6,
            currentSegment: 5,
            tripwirePhase: 'CRITICAL_OVERDRIVE',
            visionConeDegrees: 60,
            isTriggered: true,
            lastTickedAtMs: 1,
        })
        model.clocks.set('c2', {
            clockId: 'c2',
            entityId: 'e2',
            clockName: 'MTR2',
            valueBps: 7000,
            thresholdBps: 8000,
            decayRateBps: 100,
            segmentsCount: 6,
            currentSegment: 4,
            tripwirePhase: 'HYPERVIGILANT',
            visionConeDegrees: 60,
            isTriggered: false,
            lastTickedAtMs: 1,
        })

        const slv = vi.fn()
        await auditThermodynamicsAction(model, { idx: 'audit', slv }, {} as any)

        expect(slv).toHaveBeenCalled()
        const report = slv.mock.calls[0][0].auditReport
        expect(report.totalClocks).toBe(2)
        expect(report.totalSystemHeatBps).toBe(15500)
        expect(report.criticalOverdriveCount).toBe(1)
        expect(report.hypervigilantCount).toBe(1)
    })

    it('routes APPLY_THERMODYNAMIC_IMPULSE cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: APPLY_THERMODYNAMIC_IMPULSE,
                bale: {
                    idx: 'test-impulse',
                    dat: {
                        impulseParams: {
                            clockId: 'non_existent',
                            impulseBps: 100,
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
