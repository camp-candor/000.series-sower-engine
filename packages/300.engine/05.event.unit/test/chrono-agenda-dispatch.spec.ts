import { describe, expect, it } from 'vitest'
import { evaluatePacingTensionGate } from '../buz/event.buzz.js'
import {
    DEFAULT_PACING_BUDGET_POLICY,
    type PacingBudgetState,
} from '../fce/event.interface.js'
import {
    createInitialAutonomousSimState,
    stepAutonomousSimulationTick,
} from '../../00.engine.unit/buz/engine.buzz.js'
import { normalizeLoreChronology } from '../../17.tick.unit/fce/tick.interface.js'
import type { ScheduledStoryBeat } from '../../17.tick.unit/fce/tick.interface.js'

const beat = (
    overrides: Partial<ScheduledStoryBeat> = {},
): ScheduledStoryBeat =>
    Object.freeze({
        beat_id: 'curfew_2330',
        title: 'Midnight Curfew Tribunal',
        isoDate: '2026-10-31',
        startTimeHm: '23:30',
        beatCategory: 'GRIEVANCE_BREACH',
        priorityBps: 9000,
        reserveCooldownTicks: 4,
        toleranceTicks: 0,
        recurringDaily: false,
        ...overrides,
    }) as ScheduledStoryBeat

const baseState: PacingBudgetState = {
    lastSceneTick: 10,
    lastSceneElapsedSeconds: 600,
    currentAct: 'ACT_II',
    droughtPressureBps: 0,
    ticksSinceLastScene: 1,
    elapsedSeconds: 660,
}

describe('chrono agenda dispatch', () => {
    it('holds back non-critical drought breakers during reserve locks', () => {
        const candidate = {
            tick: 11,
            category: 'GRIEVANCE_BREACH' as const,
            severityBps: 5000,
            triggerReason: 'minor filler',
        }
        const verdict = evaluatePacingTensionGate(
            candidate,
            baseState,
            DEFAULT_PACING_BUDGET_POLICY,
            undefined,
            96,
            {
                activeReserveLocks: [{ beat_id: 'curfew_2330' }],
                isDroughtBreakerCandidate: true,
            },
        )
        expect(verdict.suppressedByAgendaReserve).toBe(true)
        expect(verdict.significant).toBe(false)
    })

    it('lets critical catastrophes override reserve locks', () => {
        const candidate = {
            tick: 11,
            category: 'GRIEVANCE_BREACH' as const,
            severityBps: 9000,
            triggerReason: 'critical catastrophe',
        }
        const verdict = evaluatePacingTensionGate(
            candidate,
            baseState,
            DEFAULT_PACING_BUDGET_POLICY,
            undefined,
            96,
            {
                activeReserveLocks: [{ beat_id: 'curfew_2330' }],
                isDroughtBreakerCandidate: true,
            },
        )
        expect(verdict.criticalOverrideApplied).toBe(true)
        expect(verdict.suppressedByAgendaReserve).toBe(false)
        expect(verdict.significant).toBe(true)
    })

    it('fires due scheduled beat deterministically even past cooldown', () => {
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '23:15:00',
            tick_seconds: 900,
            frames_per_second: 24,
        })
        let state = createInitialAutonomousSimState(
            'agenda_fire_seed01',
            clock,
            {
                pacingPolicy: {
                    ...DEFAULT_PACING_BUDGET_POLICY,
                    min_ticks_between_scenes: 1000,
                    min_minutes_between_scenes: 100000,
                    max_dry_spell_ticks: 1000,
                },
                scheduledBeats: [beat()],
                consumedAgendaKeys: [],
                droughtBreakersHeldByReserve: 0,
                triggeredAgendaBeats: [],
            },
        )
        const receipt = stepAutonomousSimulationTick(state)
        state = receipt.nextState
        expect(receipt.significantEvents.length).toBeGreaterThanOrEqual(1)
        const agendaEvts = (
            receipt.significantEvents as unknown as Array<
                Record<string, unknown>
            >
        ).filter((e) => e['agendaScheduled'] === true)
        expect(agendaEvts.length).toBe(1)
        const evt = agendaEvts[0] as Record<string, unknown>
        expect(evt['agendaScheduled']).toBe(true)
        expect(evt['agendaBeatId']).toBe('curfew_2330')
        expect(evt['category']).toBe('GRIEVANCE_BREACH')
        expect(evt['severityBps']).toBe(9000)
        expect(state.consumedAgendaKeys).toContain('curfew_2330@2026-10-31')
        expect(state.triggeredAgendaBeats).toContain('curfew_2330')
        expect(Object.isFrozen(state)).toBe(true)
        expect(Object.isFrozen(receipt.significantEvents)).toBe(true)
    })

    it('holds drought filler during reserve and fires once without double', () => {
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '22:30:00',
            tick_seconds: 900,
            frames_per_second: 24,
        })
        let state = createInitialAutonomousSimState(
            'agenda_hold_seed01',
            clock,
            {
                pacingPolicy: {
                    ...DEFAULT_PACING_BUDGET_POLICY,
                    min_ticks_between_scenes: 0,
                    min_minutes_between_scenes: 0,
                    max_dry_spell_ticks: 1,
                },
                scheduledBeats: [beat()],
                consumedAgendaKeys: [],
                droughtBreakersHeldByReserve: 0,
                triggeredAgendaBeats: [],
            },
        )
        let heldObserved = 0
        let fired = 0
        for (let i = 0; i < 6; i += 1) {
            const receipt = stepAutonomousSimulationTick(state)
            state = receipt.nextState
            heldObserved = state.droughtBreakersHeldByReserve ?? 0
            for (const evt of receipt.significantEvents as unknown as Array<
                Record<string, unknown>
            >) {
                if (evt['agendaScheduled'] === true) fired += 1
            }
            expect(Object.isFrozen(state)).toBe(true)
        }
        expect(heldObserved).toBeGreaterThanOrEqual(1)
        expect(fired).toBe(1)
        const receipt2 = stepAutonomousSimulationTick(state)
        const doubleFire = (
            receipt2.significantEvents as unknown as Array<
                Record<string, unknown>
            >
        ).filter((e) => e['agendaScheduled'] === true)
        expect(doubleFire.length).toBe(0)
    })

    it('keeps input state immutable', () => {
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '23:15:00',
            tick_seconds: 900,
            frames_per_second: 24,
        })
        const before = createInitialAutonomousSimState(
            'agenda_imm_seed01',
            clock,
            {
                scheduledBeats: [beat()],
            },
        )
        const beforeKeys = [...(before.consumedAgendaKeys ?? [])]
        stepAutonomousSimulationTick(before)
        expect(before.consumedAgendaKeys).toEqual(beforeKeys)
        expect(before.droughtBreakersHeldByReserve).toBe(0)
    })
})
