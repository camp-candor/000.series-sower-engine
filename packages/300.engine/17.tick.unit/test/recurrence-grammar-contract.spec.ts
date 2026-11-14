import { describe, expect, it } from 'vitest'
import {
    normalizeEngineRecurrenceRule,
    extractScheduledBeatsFromBible,
    extractSeriesBlackoutDatesFromBible,
} from '../../00.engine.unit/buz/engine.buzz.js'

describe('phase one recurrence grammar contract', () => {
    it('normalizes legacy recurringDaily true to DAILY', () => {
        const rule = normalizeEngineRecurrenceRule({
            beat_id: 'b1',
            recurringDaily: true,
        } as never)
        expect(rule.frequency).toBe('DAILY')
        expect(rule.blackoutShiftPolicy).toBe('SKIP')
        expect(Object.isFrozen(rule)).toBe(true)
    })
    it('normalizes legacy recurringDaily false to ONCE', () => {
        const rule = normalizeEngineRecurrenceRule({
            beat_id: 'b1',
            recurringDaily: false,
        } as never)
        expect(rule.frequency).toBe('ONCE')
    })
    it('extracts sorted deduped series blackouts', () => {
        const out = extractSeriesBlackoutDatesFromBible({
            chronology: {
                series_blackout_dates: [
                    '2026-12-25',
                    '2026-12-25',
                    '2026-01-01',
                    'bad-date',
                ],
            },
        })
        expect([...out]).toEqual(['2026-01-01', '2026-12-25'])
        expect(Object.isFrozen(out)).toBe(true)
        expect(extractSeriesBlackoutDatesFromBible(null)).toEqual([])
        expect(extractSeriesBlackoutDatesFromBible({})).toEqual([])
    })
    it('populates normalized recurrenceRule on extracted beats', () => {
        const beats = extractScheduledBeatsFromBible({
            chronology: {
                scheduled_beats: [
                    {
                        beat_id: 'daily_a',
                        title: 'Daily A',
                        isoDate: '2026-10-31',
                        startTimeHm: '08:00',
                        beatCategory: 'CHRONO_MILESTONE',
                        priorityBps: 5000,
                        reserveCooldownTicks: 1,
                        recurringDaily: true,
                    },
                ],
            },
        })
        expect(beats.length).toBe(1)
        expect(beats[0]?.recurrenceRule?.frequency).toBe('DAILY')
    })
})
