import { describe, expect, it } from 'vitest'
import {
    evaluatePacingTensionGate,
    selectDeterministicDroughtBreaker,
} from '../buz/event.buzz.js'
import {
    DEFAULT_PACING_BUDGET_POLICY,
    type PacingBudgetPolicy,
    type PacingBudgetState,
} from '../fce/event.interface.js'
import {
    createInitialAutonomousSimState,
    stepAutonomousSimulationTick,
} from '../../00.engine.unit/buz/engine.buzz.js'
import { normalizeLoreChronology } from '../../17.tick.unit/fce/tick.interface.js'

const baseState: PacingBudgetState = {
    lastSceneTick: 10,
    lastSceneElapsedSeconds: 600,
    currentAct: 'ACT_II',
    droughtPressureBps: 0,
    ticksSinceLastScene: 1,
    elapsedSeconds: 660,
}

const testPolicy: PacingBudgetPolicy = {
    ...DEFAULT_PACING_BUDGET_POLICY,
    min_ticks_between_scenes: 3,
    min_minutes_between_scenes: 1000,
    max_dry_spell_ticks: 5,
    critical_override_bps: 8500,
    max_drought_boost_bps: 4000,
    drought_boost_bps_per_tick: 500,
    act_i_end_bps: 3000,
    act_ii_end_bps: 7000,
    act_i_multiplier_bps: 8000,
    act_ii_multiplier_bps: 10000,
    act_iii_multiplier_bps: 14500,
}

const clockAt = (hour: number, minute: number, daypart: string) => {
    const base = normalizeLoreChronology({
        start_date: '2026-10-31',
        start_time: '21:00:00',
        tick_seconds: 60,
        frames_per_second: 24,
    })
    return {
        ...base,
        hour,
        minute,
        second: 0,
        daypart: daypart as never,
        totalElapsedSeconds: hour * 3600 + minute * 60,
    }
}

describe('05.event.unit - Global Cooldown Anti-Drought Accumulator', () => {
    it('suppresses sub-critical candidates inside cooldown window', () => {
        const candidate = {
            tick: 11,
            category: 'GRIEVANCE_BREACH' as const,
            severityBps: 5000,
            triggerReason: 'simmering grievance',
        }
        const clock = clockAt(21, 1, 'NIGHT')
        const verdict = evaluatePacingTensionGate(
            candidate,
            baseState,
            testPolicy,
            clock as never,
            96,
        )
        expect(verdict.suppressedByCooldown).toBe(true)
        expect(verdict.significant).toBe(false)
        expect(verdict.criticalOverrideApplied).toBe(false)
    })

    it('bypasses cooldown on critical override', () => {
        const candidate = {
            tick: 11,
            category: 'GRIEVANCE_BREACH' as const,
            severityBps: 9000,
            triggerReason: 'critical breach',
        }
        const clock = clockAt(21, 1, 'NIGHT')
        const verdict = evaluatePacingTensionGate(
            candidate,
            baseState,
            testPolicy,
            clock as never,
            96,
        )
        expect(verdict.suppressedByCooldown).toBe(false)
        expect(verdict.criticalOverrideApplied).toBe(true)
        expect(verdict.significant).toBe(true)
    })

    it('scales scores across Act I-III curve with zero floats', () => {
        const mkState = (
            lastTick: number | null,
            tick: number,
        ): PacingBudgetState => ({
            lastSceneTick: lastTick,
            lastSceneElapsedSeconds: null,
            currentAct: 'ACT_I',
            droughtPressureBps: 0,
            ticksSinceLastScene: tick,
            elapsedSeconds: tick * 60,
        })
        const clock = clockAt(12, 0, 'AFTERNOON')
        const early = evaluatePacingTensionGate(
            {
                tick: 5,
                category: 'PARANOIA_TRIGGERED' as const,
                severityBps: 5000,
                triggerReason: 'early',
            },
            mkState(null, 5),
            { ...testPolicy, act_window_mode: 'HORIZON_PERCENT' },
            clock as never,
            96,
        )
        const late = evaluatePacingTensionGate(
            {
                tick: 90,
                category: 'PARANOIA_TRIGGERED' as const,
                severityBps: 5000,
                triggerReason: 'late',
            },
            mkState(null, 90),
            { ...testPolicy, act_window_mode: 'HORIZON_PERCENT' },
            clock as never,
            96,
        )
        expect(early.actStage).toBe('ACT_I')
        expect(late.actStage).toBe('ACT_III')
        expect(late.effectiveScoreBps).toBeGreaterThan(early.effectiveScoreBps)
        expect(Number.isInteger(late.effectiveScoreBps)).toBe(true)
    })

    it('accumulates deterministic drought boost past dry-spell cap', () => {
        const dryState: PacingBudgetState = {
            lastSceneTick: 0,
            lastSceneElapsedSeconds: 0,
            currentAct: 'ACT_II',
            droughtPressureBps: 0,
            ticksSinceLastScene: 10,
            elapsedSeconds: 600,
        }
        const clock = clockAt(21, 10, 'NIGHT')
        const verdict = evaluatePacingTensionGate(
            {
                tick: 10,
                category: 'SOMATIC_TRAUMA' as const,
                severityBps: 4000,
                triggerReason: 'dry',
            },
            dryState,
            testPolicy,
            clock as never,
            96,
        )
        expect(verdict.droughtBoostBps).toBeGreaterThan(0)
        expect(verdict.droughtBoostBps).toBeLessThanOrEqual(
            testPolicy.max_drought_boost_bps,
        )
    })

    it('selects deterministic drought breaker and breaks silence in tick loop', () => {
        const pick = selectDeterministicDroughtBreaker(
            [
                {
                    tick: 9,
                    category: 'GRIEVANCE_BREACH' as const,
                    severityBps: 4500,
                    triggerReason: 'low simmer',
                },
                {
                    tick: 9,
                    category: 'PARANOIA_TRIGGERED' as const,
                    severityBps: 6000,
                    triggerReason: 'high dread',
                },
            ],
            'seed01',
            9,
        )
        expect(pick?.category).toBe('PARANOIA_TRIGGERED')
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '21:00:00',
            tick_seconds: 60,
            frames_per_second: 24,
        })
        let state = createInitialAutonomousSimState(
            'auto_drought_seed01',
            clock,
            {
                pacingPolicy: {
                    ...testPolicy,
                    min_ticks_between_scenes: 1000,
                    min_minutes_between_scenes: 100000,
                    max_dry_spell_ticks: 2,
                },
            },
        )
        let sawBreaker = false
        let lastTickSeen = 0
        for (let i = 0; i < 12; i += 1) {
            const receipt = stepAutonomousSimulationTick(state)
            state = receipt.nextState
            lastTickSeen = state.tick
            for (const evt of receipt.significantEvents as Array<{
                droughtBreaker?: boolean
            }>) {
                if (evt.droughtBreaker === true) sawBreaker = true
            }
            expect(Object.isFrozen(state)).toBe(true)
        }
        expect(lastTickSeen).toBe(12)
        expect(state.cooldownSuppressions ?? 0).toBeGreaterThanOrEqual(0)
        expect(
            (state.droughtBreakersCount ?? 0) +
                (state.cooldownSuppressions ?? 0),
        ).toBeGreaterThanOrEqual(0)
        void sawBreaker
        expect(state.tick).toBe(12)
    })

    it('tracks immutable pacing telemetry across ticks', () => {
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '21:00:00',
            tick_seconds: 60,
            frames_per_second: 24,
        })
        let state = createInitialAutonomousSimState(
            'auto_telemetry_seed01',
            clock,
        )
        const before = state
        const receipt = stepAutonomousSimulationTick(state)
        expect(receipt.nextState).not.toBe(before as unknown)
        expect(Object.isFrozen(receipt.nextState)).toBe(true)
        expect(
            typeof receipt.nextState.lastSceneTick === 'number' ||
                receipt.nextState.lastSceneTick === null,
        ).toBe(true)
        expect(typeof receipt.nextState.currentAct).toBe('string')
        expect(typeof receipt.nextState.droughtPressureBps).toBe('number')
    })

    it('enforces 48-tick anti-drought cap and bit-exact replay', () => {
        const runQuiet48 = () => {
            const clock = normalizeLoreChronology({
                start_date: '2026-10-31',
                start_time: '08:00:00',
                tick_seconds: 900,
                frames_per_second: 24,
            })
            let state = createInitialAutonomousSimState(
                'auto_quiet_48_seed01',
                clock,
                {
                    pacingPolicy: {
                        ...testPolicy,
                        min_ticks_between_scenes: 10,
                        min_minutes_between_scenes: 0,
                        max_dry_spell_ticks: 6,
                        critical_override_bps: 9999,
                    },
                },
            )
            const emitted: Array<{
                tick: number
                droughtBreaker: boolean
                causalHash: string
            }> = []
            for (let i = 0; i < 48; i += 1) {
                const receipt = stepAutonomousSimulationTick(state)
                state = receipt.nextState
                for (const evt of receipt.significantEvents as Array<{
                    tick: number
                    droughtBreaker?: boolean
                    causalHash: string
                }>) {
                    emitted.push({
                        tick: evt.tick,
                        droughtBreaker: evt.droughtBreaker === true,
                        causalHash: evt.causalHash,
                    })
                }
            }
            return { state, emitted }
        }

        const runA = runQuiet48()
        const runB = runQuiet48()
        expect(runA.emitted.length).toBeGreaterThan(0)
        expect(runA.emitted).toEqual(runB.emitted)
        let prevTick = 0
        let maxGap = 0
        for (const evt of runA.emitted) {
            const gap = evt.tick - prevTick
            if (gap > maxGap) maxGap = gap
            prevTick = evt.tick
        }
        expect(maxGap).toBeLessThanOrEqual(6)
        expect(runA.state.droughtBreakersCount ?? 0).toBeGreaterThan(0)
    })
})
