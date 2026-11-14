import { describe, expect, it } from 'vitest'
import {
    canBeatFireUnderMaxOccurrences,
    shouldTriggerRecurringBeatOccurrence,
} from '../buz/event.buzz.js'
import { normalizeLoreChronology } from '../../17.tick.unit/fce/tick.interface.js'
import {
    createInitialAutonomousSimState,
    stepAutonomousSimulationTick,
} from '../../00.engine.unit/buz/engine.buzz.js'

describe('phase five recurring dispatch', () => {
    it('enforces maxOccurrences cap', () => {
        const beat = {
            beat_id: 'b1',
            recurrenceRule: { maxOccurrences: 3 },
        } as never
        expect(canBeatFireUnderMaxOccurrences(beat, 0)).toBe(true)
        expect(canBeatFireUnderMaxOccurrences(beat, 2)).toBe(true)
        expect(canBeatFireUnderMaxOccurrences(beat, 3)).toBe(false)
        expect(shouldTriggerRecurringBeatOccurrence(beat, 3)).toBe(false)
    })
    it('fires multi-occurrence with metadata and retires at cap', () => {
        const beat = Object.freeze({
            beat_id: 'daily_court',
            title: 'Daily Court',
            isoDate: '2026-10-31',
            startTimeHm: '08:00',
            beatCategory: 'CHRONO_MILESTONE',
            priorityBps: 9000,
            reserveCooldownTicks: 0,
            toleranceTicks: 10000,
            recurringDaily: true,
            recurrenceRule: {
                frequency: 'DAILY',
                blackoutDates: [],
                blackoutWeekdays: [],
                blackoutShiftPolicy: 'SKIP',
                maxOccurrences: 2,
            },
        }) as never
        const clock = normalizeLoreChronology({
            start_date: '2026-10-31',
            start_time: '07:00:00',
            tick_seconds: 3600,
            frames_per_second: 24,
        })
        let state = createInitialAutonomousSimState('seed_phase_five', clock, {
            scheduledBeats: [beat],
        } as never)
        const seen: number[] = []
        for (let i = 0; i < 4; i += 1) {
            const receipt = stepAutonomousSimulationTick(state)
            state = receipt.nextState
            for (const evt of receipt.significantEvents as unknown as Array<{
                agendaBeatId?: string
                recurring?: {
                    occurrenceIndex: number
                    recurrenceFrequency: string
                    weekday: string
                    lunarPhase: string
                    deferredFromIsoDate: string | null
                }
            }>) {
                if (evt.agendaBeatId === 'daily_court') {
                    expect(evt.recurring).toBeDefined()
                    seen.push(evt.recurring?.occurrenceIndex ?? 0)
                    expect(evt.recurring?.recurrenceFrequency).toBe('DAILY')
                    expect(typeof evt.recurring?.weekday).toBe('string')
                    expect(typeof evt.recurring?.lunarPhase).toBe('string')
                }
            }
        }
        expect(seen).toEqual([1, 2])
        expect(
            (state.beatOccurrenceCounts as Record<string, number>)[
                'daily_court'
            ],
        ).toBe(2)
    })
})
