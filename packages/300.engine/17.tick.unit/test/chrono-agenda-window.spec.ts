import { describe, expect, it } from 'vitest'
import { normalizeLoreChronology } from '../fce/tick.interface.js'
import {
    computeAgendaBeatTargetTick,
    computeAgendaBeatDeltaSeconds,
    computeGregorianTimestampSeconds,
    evaluateChronoAgendaWindow,
} from '../buz/tick.buzz.js'
import { extractScheduledBeatsFromBible } from '../../00.engine.unit/buz/engine.buzz.js'
import type { ScheduledStoryBeat } from '../fce/tick.interface.js'

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

const clockAt = (isoDate: string, timeHms: string, tickSeconds = 60) =>
    normalizeLoreChronology({
        start_date: isoDate,
        start_time: timeHms,
        tick_seconds: tickSeconds,
        frames_per_second: 24,
    })

describe('chrono agenda window matcher', () => {
    it('computes Gregorian epoch seconds deterministically', () => {
        const a = computeGregorianTimestampSeconds('2026-10-31', '23:30')
        const b = computeGregorianTimestampSeconds('2026-10-31', '23:30')
        expect(a).toBe(b)
        expect(Number.isInteger(a)).toBe(true)
        const c = computeGregorianTimestampSeconds('2026-11-01', '00:30')
        expect(c - a).toBe(3600)
    })

    it('computes delta seconds as pure integer subtraction', () => {
        expect(computeAgendaBeatDeltaSeconds(200, 100)).toBe(100)
        expect(computeAgendaBeatDeltaSeconds(100, 200)).toBe(-100)
    })

    it('computes target tick from reference clock', () => {
        const ref = clockAt('2026-10-31', '23:15:00', 900)
        const target = computeAgendaBeatTargetTick(
            beat(),
            '2026-10-31',
            ref,
            0,
            900,
        )
        expect(target).toBe(1)
    })

    it('detects exact due appointment on coarse tick crossing', () => {
        const prev = clockAt('2026-10-31', '23:15:00', 900)
        const next = clockAt('2026-10-31', '23:30:00', 900)
        const status = evaluateChronoAgendaWindow(
            6,
            prev,
            next,
            [beat()],
            [],
            900,
        )
        expect(status.dueBeats.length).toBe(1)
        expect(status.dueBeats[0]?.beat.beat_id).toBe('curfew_2330')
        expect(status.dueBeats[0]?.occurrenceKey).toBe('curfew_2330@2026-10-31')
        expect(Object.isFrozen(status)).toBe(true)
    })

    it('flags active reserve lockout window before deadline', () => {
        const prev = clockAt('2026-10-31', '23:00:00', 900)
        const next = clockAt('2026-10-31', '23:15:00', 900)
        const status = evaluateChronoAgendaWindow(
            5,
            prev,
            next,
            [beat()],
            [],
            900,
        )
        expect(status.dueBeats.length).toBe(0)
        expect(status.activeReserveLocks.length).toBe(1)
        expect(
            status.activeReserveLocks[0]?.ticksUntilBeat,
        ).toBeGreaterThanOrEqual(1)
        expect(
            status.activeReserveLocks[0]?.ticksUntilBeat,
        ).toBeLessThanOrEqual(4)
    })

    it('skips consumed occurrences to prevent double firing', () => {
        const prev = clockAt('2026-10-31', '23:15:00', 900)
        const next = clockAt('2026-10-31', '23:30:00', 900)
        const status = evaluateChronoAgendaWindow(
            6,
            prev,
            next,
            [beat()],
            ['curfew_2330@2026-10-31'],
            900,
        )
        expect(status.dueBeats.length).toBe(0)
    })

    it('matches recurring daily beats across midnight without double firing same date', () => {
        const daily = beat({
            recurringDaily: true,
            beat_id: 'dawn_0800',
            startTimeHm: '08:00',
        })
        const prev1 = clockAt('2026-10-31', '07:00:00', 3600)
        const next1 = clockAt('2026-10-31', '08:00:00', 3600)
        const s1 = evaluateChronoAgendaWindow(
            8,
            prev1,
            next1,
            [daily],
            [],
            3600,
        )
        expect(s1.dueBeats.length).toBe(1)
        const consumed = [s1.dueBeats[0]?.occurrenceKey as string]
        const prev2 = clockAt('2026-11-01', '07:00:00', 3600)
        const next2 = clockAt('2026-11-01', '08:00:00', 3600)
        const s2 = evaluateChronoAgendaWindow(
            32,
            prev2,
            next2,
            [daily],
            consumed,
            3600,
        )
        expect(s2.dueBeats.length).toBe(1)
        expect(s2.dueBeats[0]?.occurrenceKey).toBe('dawn_0800@2026-11-01')
        const s3 = evaluateChronoAgendaWindow(
            32,
            prev2,
            next2,
            [daily],
            [...consumed, 'dawn_0800@2026-11-01'],
            3600,
        )
        expect(s3.dueBeats.length).toBe(0)
    })

    it('honors toleranceTicks window', () => {
        const tolerant = beat({ toleranceTicks: 1 })
        const ref = clockAt('2026-10-31', '23:30:00', 900)
        const status = evaluateChronoAgendaWindow(
            7,
            ref,
            ref,
            [tolerant],
            [],
            900,
        )
        expect(status.dueBeats.length).toBe(1)
    })

    it('extracts scheduled beats from bible and returns empty on legacy manifests', () => {
        expect(extractScheduledBeatsFromBible(null)).toEqual([])
        expect(extractScheduledBeatsFromBible({})).toEqual([])
        const beats = extractScheduledBeatsFromBible({
            chronology: {
                scheduled_beats: [
                    {
                        beat_id: 'curfew_2330',
                        title: 'Curfew',
                        isoDate: '2026-10-31',
                        startTimeHm: '23:30',
                        beatCategory: 'GRIEVANCE_BREACH',
                        priorityBps: 9000,
                        reserveCooldownTicks: 2,
                    },
                ],
            },
        })
        expect(beats.length).toBe(1)
        expect(beats[0]?.beat_id).toBe('curfew_2330')
        expect(Object.isFrozen(beats)).toBe(true)
    })

    it('sorts extracted beats canonically', () => {
        const beats = extractScheduledBeatsFromBible({
            chronology: {
                scheduled_beats: [
                    {
                        beat_id: 'b_beat',
                        title: 'B',
                        isoDate: '2026-10-31',
                        startTimeHm: '23:30',
                        beatCategory: 'GRIEVANCE_BREACH',
                        priorityBps: 5000,
                        reserveCooldownTicks: 1,
                    },
                    {
                        beat_id: 'a_beat',
                        title: 'A',
                        isoDate: '2026-10-31',
                        startTimeHm: '08:00',
                        beatCategory: 'CHRONO_MILESTONE',
                        priorityBps: 5000,
                        reserveCooldownTicks: 1,
                    },
                ],
            },
        })
        expect(beats[0]?.beat_id).toBe('a_beat')
        expect(beats[1]?.beat_id).toBe('b_beat')
    })

    it('activates reserve lock across midnight for recurring daily beats', () => {
        const postMidnightDaily = beat({
            beat_id: 'watch_0015',
            startTimeHm: '00:15',
            recurringDaily: true,
            reserveCooldownTicks: 4,
        })
        const prev = clockAt('2026-10-31', '23:00:00', 900)
        const next = clockAt('2026-10-31', '23:15:00', 900)
        const status = evaluateChronoAgendaWindow(
            5,
            prev,
            next,
            [postMidnightDaily],
            [],
            900,
        )
        expect(status.dueBeats.length).toBe(0)
        expect(status.activeReserveLocks.length).toBe(1)
        expect(status.activeReserveLocks[0]?.occurrenceKey).toBe(
            'watch_0015@2026-11-01',
        )
        expect(status.activeReserveLocks[0]?.ticksUntilBeat).toBe(4)
    })
})
