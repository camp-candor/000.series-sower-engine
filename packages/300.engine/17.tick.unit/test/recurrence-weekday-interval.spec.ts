import { describe, expect, it } from 'vitest'
import {
    resolveEngineGregorianWeekday,
    computeDaysBetweenIsoDates,
    matchesWeekdayOrIntervalCadence,
} from '../buz/tick.buzz.js'

const mkBeat = (over: Record<string, unknown> = {}): never =>
    Object.freeze({
        beat_id: 'court_friday',
        title: 'Court',
        isoDate: '2026-10-30',
        startTimeHm: '09:00',
        beatCategory: 'GRIEVANCE_BREACH',
        priorityBps: 5000,
        reserveCooldownTicks: 1,
        toleranceTicks: 0,
        recurringDaily: false,
        recurrenceRule: {
            frequency: 'WEEKLY_MASK',
            weekdayMask: ['FRI'],
            blackoutDates: [],
            blackoutWeekdays: [],
            blackoutShiftPolicy: 'SKIP',
        },
        ...over,
    }) as never

describe('phase two weekday interval cadence', () => {
    it('resolves Sakamoto weekdays across leap boundary', () => {
        expect(resolveEngineGregorianWeekday('2026-10-30')).toBe('FRI')
        expect(resolveEngineGregorianWeekday('2026-10-31')).toBe('SAT')
        expect(resolveEngineGregorianWeekday('2026-11-01')).toBe('SUN')
        expect(resolveEngineGregorianWeekday('2024-02-29')).toBe('THU')
    })
    it('computes signed day spans', () => {
        expect(computeDaysBetweenIsoDates('2026-10-31', '2026-11-01')).toBe(1)
        expect(computeDaysBetweenIsoDates('2026-11-01', '2026-10-31')).toBe(-1)
        expect(computeDaysBetweenIsoDates('2024-02-28', '2024-02-29')).toBe(1)
    })
    it('matches WEEKLY_MASK only on masked weekdays', () => {
        const beat = mkBeat()
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-10-30')).toBe(true)
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-10-31')).toBe(false)
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-11-06')).toBe(true)
    })
    it('matches INTERVAL_DAYS cadence', () => {
        const beat = mkBeat({
            isoDate: '2026-10-30',
            recurrenceRule: {
                frequency: 'INTERVAL_DAYS',
                intervalDays: 3,
                blackoutDates: [],
                blackoutWeekdays: [],
                blackoutShiftPolicy: 'SKIP',
            },
        })
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-10-30')).toBe(true)
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-11-02')).toBe(true)
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-11-01')).toBe(false)
    })
    it('honors untilIsoDate cutoff', () => {
        const beat = mkBeat({
            recurrenceRule: {
                frequency: 'DAILY',
                blackoutDates: [],
                blackoutWeekdays: [],
                blackoutShiftPolicy: 'SKIP',
                untilIsoDate: '2026-10-31',
            },
        })
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-10-31')).toBe(true)
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-11-01')).toBe(false)
        expect(matchesWeekdayOrIntervalCadence(beat, '2026-10-29')).toBe(false)
    })
})
