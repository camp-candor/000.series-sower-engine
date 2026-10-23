import { describe, it, expect, beforeEach } from 'vitest'
import { ParanoiaModel } from './paranoia.model'
import * as Buzz from './buz/paranoia.buzz'

describe('12.paranoia.unit (Unified Pressure Meters & Clocks)', () => {
    let model: ParanoiaModel
    let mockState: any

    beforeEach(() => {
        model = new ParanoiaModel()
        mockState = {
            hunt: async () => ({}),
        }
    })

    it('rejects floating-point tension scalars with [FLOAT_PROHIBITED]', async () => {
        let result: any = null
        await Buzz.upsertClockParanoia(
            model,
            {
                idx: 'test',
                dat: {
                    clock_id: 'clk_watch',
                    entity_id: 'char_bog',
                    clock_name: 'the_attic_watch',
                    value_bps: 1250.5,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.parBit.idx).toBe('upsert-clock-paranoia-error')
        expect(result.parBit.src).toContain('[FLOAT_PROHIBITED]')
    })

    it('upserts clock and evaluates is_triggered flag', async () => {
        let result: any = null
        await Buzz.upsertClockParanoia(
            model,
            {
                idx: 'test',
                dat: {
                    clock_id: 'clk_pantry_sweep',
                    entity_id: 'char_bog',
                    clock_name: 'pantry_contraband',
                    value_bps: 8500,
                    threshold_bps: 8000,
                    decay_rate_bps: 1000,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.parBit.idx).toBe('upsert-clock-paranoia')
        expect(model.clocks['clk_pantry_sweep'].is_triggered).toBe(1)
    })

    it('trips boil-over trigger when tick pushes value >= threshold', async () => {
        model.clocks['clk_pantry_sweep'] = {
            clock_id: 'clk_pantry_sweep',
            entity_id: 'char_bog',
            clock_name: 'pantry_contraband',
            value_bps: 7000,
            threshold_bps: 8000,
            decay_rate_bps: 500,
            is_triggered: 0,
            updated_at_ms: 100,
        }

        let result: any = null
        await Buzz.tickClockParanoia(
            model,
            {
                idx: 'test',
                dat: {
                    clock_id: 'clk_pantry_sweep',
                    delta_bps: 1500,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.parBit.idx).toBe('tick-clock-paranoia')
        expect(model.clocks['clk_pantry_sweep'].value_bps).toBe(8500)
        expect(model.clocks['clk_pantry_sweep'].is_triggered).toBe(1)
    })

    it('sweeps and identifies all currently breached clocks', () => {
        model.clocks['clk_a'] = {
            clock_id: 'clk_a',
            entity_id: 'char_bog',
            clock_name: 'watch_a',
            value_bps: 9000,
            threshold_bps: 8000,
            decay_rate_bps: 500,
            is_triggered: 1,
            updated_at_ms: 100,
        }

        model.clocks['clk_b'] = {
            clock_id: 'clk_b',
            entity_id: 'char_wart',
            clock_name: 'watch_b',
            value_bps: 4000,
            threshold_bps: 8000,
            decay_rate_bps: 500,
            is_triggered: 0,
            updated_at_ms: 100,
        }

        let result: any = null
        Buzz.sweepBoilOverParanoia(
            model,
            {
                idx: 'test',
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.parBit.val).toBe(1)
        expect(result.parBit.lst[0].clock_id).toBe('clk_a')
    })

    it('decays clock value and clears triggered state when below threshold', async () => {
        model.clocks['clk_a'] = {
            clock_id: 'clk_a',
            entity_id: 'char_bog',
            clock_name: 'watch_a',
            value_bps: 8200,
            threshold_bps: 8000,
            decay_rate_bps: 1000,
            is_triggered: 1,
            updated_at_ms: 100,
        }

        let result: any = null
        await Buzz.decayClockParanoia(
            model,
            {
                idx: 'test',
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.parBit.val).toBe(1)
        expect(model.clocks['clk_a'].value_bps).toBe(7200)
        expect(model.clocks['clk_a'].is_triggered).toBe(0)
    })
})
