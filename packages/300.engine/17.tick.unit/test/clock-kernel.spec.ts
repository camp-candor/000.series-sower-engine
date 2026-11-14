import '../../test/budget-matcher.setup.js'
import { describe, it, expect } from 'vitest'
import {
    isGregorianLeapYear,
    daysInGregorianMonth,
    deriveSimDaypart,
    initSimulationClock,
    advanceSimulationClockState,
    advanceClockTicks,
    extractLoreChronology,
    formatSmpteTimecode24,
    reduceTickStep,
} from '../tick.reduce.js'
import {
    normalizeLoreChronology,
    createInitialTickState,
    toSimTime,
} from '../fce/tick.interface.js'

describe('simulation clock kernel', () => {
    it('validates Gregorian leap year rules', () => {
        expect(isGregorianLeapYear(2024)).toBe(true)
        expect(isGregorianLeapYear(1900)).toBe(false)
        expect(isGregorianLeapYear(2000)).toBe(true)
        expect(isGregorianLeapYear(2025)).toBe(false)
        expect(daysInGregorianMonth(2024, 2)).toBe(29)
        expect(daysInGregorianMonth(2025, 2)).toBe(28)
        expect(daysInGregorianMonth(2026, 4)).toBe(30)
    })

    it('derives dayparts across 24h bands', () => {
        expect(deriveSimDaypart(5)).toBe('DAWN')
        expect(deriveSimDaypart(6)).toBe('DAWN')
        expect(deriveSimDaypart(8)).toBe('MORNING')
        expect(deriveSimDaypart(13)).toBe('AFTERNOON')
        expect(deriveSimDaypart(18)).toBe('DUSK')
        expect(deriveSimDaypart(21)).toBe('NIGHT')
        expect(deriveSimDaypart(2)).toBe('NIGHT')
    })

    it('boots from bibleState chronology at exact start instant', () => {
        const clock = extractLoreChronology({
            chronology: {
                start_date: '2026-10-31',
                start_time: '21:00:00',
                tick_seconds: 60,
                frames_per_second: 24,
            },
        })
        expect(clock.isoDate).toBe('2026-10-31')
        expect(clock.clockTimeHms).toBe('21:00:00')
        expect(clock.clockTimeHm).toBe('21:00')
        expect(clock.daypart).toBe('NIGHT')
        expect(clock.tickSeconds).toBe(60)
    })

    it('defaults deterministically when chronology omitted', () => {
        const clock = normalizeLoreChronology(null)
        expect(clock.isoDate).toBe('2026-10-31')
        expect(clock.clockTimeHms).toBe('21:00:00')
        expect(clock.tickSeconds).toBe(60)
        expect(clock.framesPerSecond).toBe(24)
        expect(clock.timezoneLabel).toBe('UTC+00:00')
        expect(clock.eraLabel).toBe('CANON_PRESENT')
    })

    it('fails closed on impossible calendar dates', () => {
        expect(() =>
            initSimulationClock({ start_date: '2025-02-29' }),
        ).toThrowError(/INVALID_SIM_START_DATE/)
        expect(() =>
            initSimulationClock({ start_date: 'not-a-date' }),
        ).toThrowError(/INVALID_SIM_START_DATE/)
        expect(() => initSimulationClock({ start_time: '25:00' })).toThrowError(
            /INVALID_SIM_START_TIME/,
        )
        expect(() => initSimulationClock({ start_time: '12:60' })).toThrowError(
            /INVALID_SIM_START_TIME/,
        )
    })

    it('rejects negative clock deltas fail-closed', () => {
        const clock = initSimulationClock(null)
        expect(() => advanceSimulationClockState(clock, -100)).toThrowError(
            /NEGATIVE_DELTA_CENTISECONDS/,
        )
    })

    it('advances wall-clock by tickSeconds per tick', () => {
        const clock = initSimulationClock({
            start_date: '2026-10-31',
            start_time: '21:00:00',
            tick_seconds: 60,
        })
        const next = advanceClockTicks(clock, 1)
        expect(next.clockTimeHms).toBe('21:01:00')
        expect(next.totalElapsedSeconds).toBe(60)
        const burst = advanceClockTicks(clock, 60)
        expect(burst.clockTimeHms).toBe('22:00:00')
    })

    it('formats SMPTE timecode at 24fps', () => {
        expect(formatSmpteTimecode24(0, 0, 24)).toBe('00:00:00:00')
        expect(formatSmpteTimecode24(60, 0, 24)).toBe('00:01:00:00')
        expect(formatSmpteTimecode24(3600, 0, 24)).toBe('01:00:00:00')
    })

    it('syncs TickStatePayload clock across reduceTickStep', () => {
        const seeded = createInitialTickState({
            start_date: '2026-10-31',
            start_time: '21:00:00',
            tick_seconds: 60,
        })
        const after = reduceTickStep({
            ...seeded,
            tick: toSimTime(0),
            actors: [],
            pending_actions: [],
        })
        expect(after.clock?.clockTimeHms).toBe('21:01:00')
        expect(after.tick).toBe(toSimTime(1))
    })

    it('rolls Gregorian calendar across month boundary', () => {
        const clock = initSimulationClock({
            start_date: '2026-01-31',
            start_time: '23:59:00',
            tick_seconds: 60,
        })
        const next = advanceClockTicks(clock, 1)
        expect(next.isoDate).toBe('2026-02-01')
        expect(next.clockTimeHms).toBe('00:00:00')
    })

    it('reduces clock advance within execution budget', () => {
        const clock = initSimulationClock(null)
        expect(() => {
            advanceSimulationClockState(clock, 6000)
        }).toExecuteWithinBudget(2.0)
    })
})
