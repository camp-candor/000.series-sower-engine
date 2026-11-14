import { describe, expect, it } from 'vitest'
import {
    fnv1a32,
    mulberry32Step,
    deriveDeterministicUint32,
    rollDeterministic2d6,
    pickDeterministicIndex,
} from '../../20.arithmetic.unit/buz/arithmetic.buzz.js'
import { evaluateEventSignificance } from '../../05.event.unit/buz/event.buzz.js'
import {
    createInitialAutonomousSimState,
    stepAutonomousSimulationTick,
} from '../../00.engine.unit/buz/engine.buzz.js'
import { normalizeLoreChronology } from '../../17.tick.unit/fce/tick.interface.js'

describe('Deterministic PRNG Significance Detector', () => {
    it('derives stable uint32 values across repeated calls', () => {
        const first = deriveDeterministicUint32('seed_alpha', 7, 'saltA')
        const second = deriveDeterministicUint32('seed_alpha', 7, 'saltA')
        expect(first).toBe(second)
        expect(Number.isInteger(first)).toBe(true)
        expect(first >= 0).toBe(true)
    })

    it('fnv1a32 and mulberry32 are deterministic', () => {
        expect(fnv1a32('hello')).toBe(fnv1a32('hello'))
        const first = mulberry32Step(12345)
        const second = mulberry32Step(12345)
        expect(first.value).toBe(second.value)
        expect(first.nextSeed).toBe(second.nextSeed)
    })

    it('rolls deterministic 2d6 inside bounds', () => {
        const roll = rollDeterministic2d6('seed_alpha', 3, 'duel')
        expect(roll.dieA).toBeGreaterThanOrEqual(1)
        expect(roll.dieA).toBeLessThanOrEqual(6)
        expect(roll.dieB).toBeGreaterThanOrEqual(1)
        expect(roll.dieB).toBeLessThanOrEqual(6)
        expect(roll.total).toBe(roll.dieA + roll.dieB)
        const again = rollDeterministic2d6('seed_alpha', 3, 'duel')
        expect(again).toEqual(roll)
    })

    it('picks deterministic index inside length', () => {
        const idx = pickDeterministicIndex('seed_alpha', 3, 'pick', 8)
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(8)
        expect(pickDeterministicIndex('seed_alpha', 3, 'pick', 8)).toBe(idx)
    })

    it('rejects non-integer and out-of-range severity bounds', () => {
        const config = { globalThresholdBps: 3000 }
        expect(() =>
            evaluateEventSignificance(
                {
                    tick: 1,
                    category: 'PARANOIA_TRIGGERED',
                    severityBps: 10.5,
                    triggerReason: 'bad',
                },
                config,
                {},
            ),
        ).toThrow()
        expect(() =>
            evaluateEventSignificance(
                {
                    tick: 1,
                    category: 'PARANOIA_TRIGGERED',
                    severityBps: 20000,
                    triggerReason: 'bad',
                },
                config,
                {},
            ),
        ).toThrow()
    })

    it('respects category enablement and cooldown gates', () => {
        const candidate = {
            tick: 5,
            category: 'PARANOIA_TRIGGERED' as const,
            severityBps: 8000,
            triggerReason: 'crossed',
        }
        const disabled = evaluateEventSignificance(
            candidate,
            {
                globalThresholdBps: 3000,
                enabledCategories: { PARANOIA_TRIGGERED: false },
            },
            {},
        )
        expect(disabled.significant).toBe(false)
        const cooling = evaluateEventSignificance(
            candidate,
            {
                globalThresholdBps: 3000,
                cooldownTicks: { PARANOIA_TRIGGERED: 5 },
            },
            { PARANOIA_TRIGGERED: 3 },
        )
        expect(cooling.significant).toBe(false)
        const passing = evaluateEventSignificance(
            candidate,
            {
                globalThresholdBps: 3000,
                cooldownTicks: { PARANOIA_TRIGGERED: 2 },
            },
            { PARANOIA_TRIGGERED: 1 },
        )
        expect(passing.significant).toBe(true)
    })

    it('emits post-event significant records deterministically over ticks 0..20', () => {
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '21:00:00',
            tick_seconds: 3600,
            frames_per_second: 24,
        })
        const runOnce = () => {
            let state = createInitialAutonomousSimState('seed_replay_01', clock)
            const collected: unknown[] = []
            for (let i = 0; i < 20; i += 1) {
                const receipt = stepAutonomousSimulationTick(state)
                state = receipt.nextState
                for (const evt of receipt.significantEvents) {
                    collected.push(evt)
                }
            }
            return collected
        }
        const first = runOnce()
        const second = runOnce()
        expect(second).toEqual(first)
        // Every significant event tick must be after commit (tick >= 1)
        for (const evt of first as Array<{ tick: number }>) {
            expect(evt.tick).toBeGreaterThanOrEqual(1)
        }
    })

    it('advances chronology milestones on daypart shift', () => {
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '04:30:00',
            tick_seconds: 3600,
            frames_per_second: 24,
        })
        let state = createInitialAutonomousSimState('seed_chrono_01', clock)
        let sawChrono = false
        for (let i = 0; i < 6; i += 1) {
            const receipt = stepAutonomousSimulationTick(state)
            state = receipt.nextState
            if (
                receipt.significantEvents.some(
                    (e) => e.category === 'CHRONO_MILESTONE',
                )
            ) {
                sawChrono = true
            }
        }
        expect(sawChrono).toBe(true)
    })

    it('matches twin 20-tick runs from SEED-COWS-2026 at 23:55:00 and diverges on SEED-COWS-2027', () => {
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '23:55:00',
            tick_seconds: 60,
            frames_per_second: 24,
        })
        const run20 = (seed: string) => {
            let state = createInitialAutonomousSimState(seed, clock)
            const events: Array<{
                tick: number
                category: string
                causalHash: string
                simTimecode: string
            }> = []
            for (let i = 0; i < 20; i += 1) {
                const receipt = stepAutonomousSimulationTick(state)
                state = receipt.nextState
                for (const evt of receipt.significantEvents) {
                    events.push({
                        tick: evt.tick,
                        category: evt.category,
                        causalHash: evt.causalHash,
                        simTimecode: `${evt.clockSnapshot.isoDate} ${evt.clockSnapshot.clockTimeHms}`,
                    })
                }
            }
            return { finalState: state, events }
        }

        const runA = run20('SEED-COWS-2026')
        const runB = run20('SEED-COWS-2026')
        const runC = run20('SEED-COWS-2027')

        expect(runB.events).toEqual(runA.events)
        expect(
            runA.events.some(
                (e) =>
                    e.category === 'CHRONO_MILESTONE' &&
                    e.simTimecode.startsWith('2026-11-01 00:00'),
            ),
        ).toBe(true)
        expect(runC.events).not.toEqual(runA.events)
    })

    it('rejects -1, 10001, and 5000.5 severityBps fail-closed and enforces 3-tick cooldown', () => {
        const config = {
            globalThresholdBps: 3000,
            cooldownTicks: { PARANOIA_TRIGGERED: 3 },
        }
        for (const badSeverity of [-1, 10001, 5000.5]) {
            expect(() =>
                evaluateEventSignificance(
                    {
                        tick: 1,
                        category: 'PARANOIA_TRIGGERED',
                        severityBps: badSeverity,
                        triggerReason: 'invalid',
                    },
                    config,
                    {},
                ),
            ).toThrow()
        }

        const first = evaluateEventSignificance(
            {
                tick: 4,
                category: 'PARANOIA_TRIGGERED',
                severityBps: 7500,
                triggerReason: 'crossed',
            },
            config,
            { PARANOIA_TRIGGERED: 2 },
        )
        expect(first.significant).toBe(false)

        const afterCooldown = evaluateEventSignificance(
            {
                tick: 5,
                category: 'PARANOIA_TRIGGERED',
                severityBps: 7500,
                triggerReason: 'crossed',
            },
            config,
            { PARANOIA_TRIGGERED: 2 },
        )
        expect(afterCooldown.significant).toBe(true)
    })
})
