import { describe, expect, it } from 'vitest'
import {
    computeCombinedPacingMultiplierBps,
    computeHorizonProgressBps,
    computeSolarDayProgressBps,
    resolveThreeActStage,
} from '../buz/arithmetic.buzz.js'
import { DEFAULT_PACING_BUDGET_POLICY } from '../../05.event.unit/fce/event.interface.js'
import { extractPacingBudgetFromBible } from '../../00.engine.unit/buz/engine.buzz.js'

describe('20.arithmetic.unit - Pure Three-Act Pacing Curve Kernel', () => {
    it('computes horizon progress in exact basis points', () => {
        expect(computeHorizonProgressBps(0, 24)).toBe(0)
        expect(computeHorizonProgressBps(12, 24)).toBe(5000)
        expect(computeHorizonProgressBps(24, 24)).toBe(10000)
        expect(computeHorizonProgressBps(96, 96)).toBe(10000)
        expect(computeHorizonProgressBps(200, 96)).toBe(10000)
        expect(computeHorizonProgressBps(1, 96)).toBe(
            Number((1n * 10000n) / 96n),
        )
    })

    it('rejects invalid horizon inputs fail-closed', () => {
        expect(() => computeHorizonProgressBps(-1, 24)).toThrow(
            /INVALID_HORIZON_PROGRESS/,
        )
        expect(() => computeHorizonProgressBps(1.5, 24)).toThrow(
            /INVALID_HORIZON_PROGRESS/,
        )
        expect(() => computeHorizonProgressBps(1, 0)).toThrow(
            /INVALID_HORIZON_PROGRESS/,
        )
    })

    it('computes 24h solar day progression across midnight wrap', () => {
        expect(computeSolarDayProgressBps(0)).toBe(0)
        expect(computeSolarDayProgressBps(43200)).toBe(5000)
        expect(computeSolarDayProgressBps(86399)).toBe(
            Number((86399n * 10000n) / 86400n),
        )
        expect(computeSolarDayProgressBps(86400)).toBe(0)
        expect(computeSolarDayProgressBps(90000)).toBe(
            computeSolarDayProgressBps(3600),
        )
        expect(computeSolarDayProgressBps(8, 0, 0)).toBe(
            Number((28800n * 10000n) / 86400n),
        )
        expect(computeSolarDayProgressBps(0, 0, 0)).toBe(0)
        expect(computeSolarDayProgressBps(23, 59, 59)).toBe(
            Number((86399n * 10000n) / 86400n),
        )
    })

    it('rejects invalid solar inputs fail-closed', () => {
        expect(() => computeSolarDayProgressBps(-5)).toThrow(
            /INVALID_SOLAR_SECONDS/,
        )
        expect(() => computeSolarDayProgressBps(1.2)).toThrow(
            /INVALID_SOLAR_SECONDS/,
        )
        expect(() => computeSolarDayProgressBps(25, 0, 0)).toThrow(
            /INVALID_SOLAR_SECONDS/,
        )
    })

    it('resolves three-act stages with fail-closed bounds', () => {
        expect(resolveThreeActStage(0, 3000, 7000)).toBe('ACT_I')
        expect(resolveThreeActStage(2999, 3000, 7000)).toBe('ACT_I')
        expect(resolveThreeActStage(3000, 3000, 7000)).toBe('ACT_II')
        expect(resolveThreeActStage(6999, 3000, 7000)).toBe('ACT_II')
        expect(resolveThreeActStage(7000, 3000, 7000)).toBe('ACT_III')
        expect(resolveThreeActStage(10000, 3000, 7000)).toBe('ACT_III')
        expect(() => resolveThreeActStage(5000, 7000, 3000)).toThrow(
            /INVALID_ACT_BOUNDS/,
        )
        expect(() => resolveThreeActStage(5000, 5000, 5000)).toThrow(
            /INVALID_ACT_BOUNDS/,
        )
    })

    it('composes act and diurnal multipliers with BigInt exactness', () => {
        expect(computeCombinedPacingMultiplierBps(8000, 10000)).toBe(8000)
        expect(computeCombinedPacingMultiplierBps(14500, 12500)).toBe(
            Number((14500n * 12500n) / 10000n),
        )
        expect(computeCombinedPacingMultiplierBps(10000, 10000)).toBe(10000)
        expect(() => computeCombinedPacingMultiplierBps(1.5, 10000)).toThrow(
            /INVALID_PACING_MULTIPLIER/,
        )
        expect(() => computeCombinedPacingMultiplierBps(-1, 10000)).toThrow(
            /INVALID_PACING_MULTIPLIER/,
        )
    })

    it('hydrates pacing budget from bible with legacy defaults', () => {
        const fallback = extractPacingBudgetFromBible(null)
        expect(fallback).toEqual(DEFAULT_PACING_BUDGET_POLICY)
        const legacy = extractPacingBudgetFromBible({})
        expect(legacy.act_i_end_bps).toBe(
            DEFAULT_PACING_BUDGET_POLICY.act_i_end_bps,
        )
        const sealed = extractPacingBudgetFromBible({
            auto_script_bundle: {
                config: {
                    pacing_budget: {
                        enabled: true,
                        act_window_mode: 'SOLAR_24H_CYCLE',
                        min_ticks_between_scenes: 2,
                        min_minutes_between_scenes: 15,
                        max_dry_spell_ticks: 6,
                        critical_override_bps: 9000,
                        max_drought_boost_bps: 3000,
                        drought_boost_bps_per_tick: 400,
                        act_i_end_bps: 2500,
                        act_ii_end_bps: 7500,
                        act_i_multiplier_bps: 8000,
                        act_ii_multiplier_bps: 10000,
                        act_iii_multiplier_bps: 15000,
                        diurnal_weights_bps: {
                            DAWN: 9000,
                            MORNING: 10000,
                            AFTERNOON: 11000,
                            DUSK: 13000,
                            NIGHT: 9500,
                        },
                    },
                },
            },
        })
        expect(sealed.act_window_mode).toBe('SOLAR_24H_CYCLE')
        expect(sealed.min_ticks_between_scenes).toBe(2)
        expect(sealed.act_iii_multiplier_bps).toBe(15000)
        expect(Object.isFrozen(sealed)).toBe(true)
    })
})
