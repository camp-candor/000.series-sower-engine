import { describe, expect, it } from 'vitest'
import { normalizeLoreChronology } from '../fce/tick.interface.js'
import {
    evaluateBlackoutException,
    evaluateChronoAgendaWindow,
} from '../buz/tick.buzz.js'

const clockAt = (iso: string, hms: string, tickSeconds = 3600) =>
    normalizeLoreChronology({
        start_date: iso,
        start_time: hms,
        tick_seconds: tickSeconds,
        frames_per_second: 24,
    })

const skipBeat = (over: Record<string, unknown> = {}): never =>
    Object.freeze({
        beat_id: 'friday_court',
        title: 'Friday Court',
        isoDate: '2026-10-30',
        startTimeHm: '09:00',
        beatCategory: 'GRIEVANCE_BREACH',
        priorityBps: 7000,
        reserveCooldownTicks: 4,
        toleranceTicks: 0,
        recurrenceRule: {
            frequency: 'WEEKLY_MASK',
            weekdayMask: ['FRI'],
            blackoutDates: ['2026-10-30'],
            blackoutWeekdays: [],
            blackoutShiftPolicy: 'SKIP',
        },
        ...over,
    }) as never

describe('phase four blackout shifter', () => {
    it('evaluates SKIP suppression', () => {
        const r = evaluateBlackoutException(skipBeat(), '2026-10-30', [])
        expect(r.isBlackedOut).toBe(true)
        expect(r.policy).toBe('SKIP')
        expect(r.effectiveIsoDate).toBeNull()
        expect(r.deferredFromIsoDate).toBe('2026-10-30')
        const clean = evaluateBlackoutException(skipBeat(), '2026-11-06', [])
        expect(clean.isBlackedOut).toBe(false)
    })
    it('defers to next valid day', () => {
        const beat = skipBeat({
            recurrenceRule: {
                frequency: 'WEEKLY_MASK',
                weekdayMask: ['FRI'],
                blackoutDates: ['2026-10-30'],
                blackoutWeekdays: [],
                blackoutShiftPolicy: 'DEFER_NEXT_VALID_DAY',
            },
        })
        const r = evaluateBlackoutException(beat, '2026-10-30', [])
        expect(r.isBlackedOut).toBe(true)
        expect(r.policy).toBe('DEFER_NEXT_VALID_DAY')
        expect(r.effectiveIsoDate).toBe('2026-10-31')
        expect(r.deferredFromIsoDate).toBe('2026-10-30')
    })
    it('SKIP date yields zero due and zero reserve plus blackoutSkips', () => {
        const prev = clockAt('2026-10-30', '08:00:00')
        const next = clockAt('2026-10-30', '09:00:00')
        const status = evaluateChronoAgendaWindow(
            9,
            prev,
            next,
            [skipBeat()],
            [],
            3600,
            [],
        )
        expect(status.dueBeats.length).toBe(0)
        expect(status.activeReserveLocks.length).toBe(0)
        expect((status.blackoutSkips ?? []).length).toBeGreaterThan(0)
    })
    it('DEFER fires on effective date with deferredFrom', () => {
        const beat = skipBeat({
            isoDate: '2026-10-30',
            recurrenceRule: {
                frequency: 'WEEKLY_MASK',
                weekdayMask: ['FRI'],
                blackoutDates: ['2026-10-30'],
                blackoutWeekdays: [],
                blackoutShiftPolicy: 'DEFER_NEXT_VALID_DAY',
            },
        })
        const prev = clockAt('2026-10-31', '08:00:00')
        const next = clockAt('2026-10-31', '09:00:00')
        const status = evaluateChronoAgendaWindow(
            9,
            prev,
            next,
            [beat],
            [],
            3600,
            [],
        )
        expect(status.dueBeats.length).toBe(1)
        expect(status.dueBeats[0]?.deferredFromIsoDate).toBe('2026-10-30')
        expect(status.dueBeats[0]?.effectiveIsoDate).toBe('2026-10-31')
    })
    it('honors blackoutWeekdays', () => {
        const beat = skipBeat({
            recurrenceRule: {
                frequency: 'DAILY',
                blackoutDates: [],
                blackoutWeekdays: ['SAT'],
                blackoutShiftPolicy: 'SKIP',
            },
        })
        const r = evaluateBlackoutException(beat, '2026-10-31', [])
        expect(r.isBlackedOut).toBe(true)
    })
})
