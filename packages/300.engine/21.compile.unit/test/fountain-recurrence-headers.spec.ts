import { describe, expect, it } from 'vitest'
import { formatRecurrenceFountainHeaders } from '../buz/compile.buzz.js'
import { synthesizeEventFountainScreenplay } from '../buz/eventFountainSynth.buzz.js'

describe('phase six fountain recurrence headers', () => {
    it('formats recurrence header block', () => {
        const lines = formatRecurrenceFountainHeaders({
            recurrenceFrequency: 'WEEKLY_MASK',
            occurrenceIndex: 2,
            weekday: 'FRI',
            lunarPhase: 'FULL_MOON',
            deferredFromIsoDate: null,
        })
        expect(lines).toContain('Recurrence-Rule: WEEKLY_MASK')
        expect(lines).toContain('Occurrence-Index: 2')
        expect(lines).toContain('Calendar-Weekday: FRI')
        expect(lines).toContain('Lunar-Phase: FULL_MOON')
    })
    it('includes Deferred-From-Blackout when present', () => {
        const lines = formatRecurrenceFountainHeaders({
            recurrenceFrequency: 'DAILY',
            occurrenceIndex: 1,
            weekday: 'SAT',
            lunarPhase: 'NEW_MOON',
            deferredFromIsoDate: '2026-10-30',
        })
        expect(lines).toContain('Deferred-From-Blackout: 2026-10-30')
    })
    it('synthesized fountain is LF-only ASCII with headers', () => {
        const receipt = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'seed_six',
            significantEvent: {
                eventSequence: 1,
                tick: 1,
                clockSnapshot: {
                    isoDate: '2026-10-31',
                    clockTimeHm: '08:00',
                    clockTimeHms: '08:00:00',
                    timecodeSmpte: '00:00:00:00',
                    daypart: 'MORNING',
                },
                category: 'CHRONO_MILESTONE',
                severityBps: 9000,
                triggerReason: 'agenda fired',
                actorsInvolved: ['char_bog'],
                locationId: 'loc_culvert',
                stateDeltaSummary: 'agenda trigger',
                causalHash: 'ab'.repeat(32),
                agendaScheduled: true,
                agendaBeatId: 'daily_court',
                agendaTitle: 'Daily Court',
                scheduledIsoDate: '2026-10-31',
                scheduledTimeHm: '08:00',
                recurring: {
                    occurrenceIndex: 2,
                    recurrenceFrequency: 'WEEKLY_MASK',
                    weekday: 'FRI',
                    lunarPhase: 'FULL_MOON',
                    deferredFromIsoDate: null,
                },
            },
            clockBefore: {
                isoDate: '2026-10-31',
                clockTimeHm: '08:00',
                clockTimeHms: '08:00:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'MORNING',
            },
            clockAfter: {
                isoDate: '2026-10-31',
                clockTimeHm: '08:00',
                clockTimeHms: '08:00:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'MORNING',
                tickSeconds: 60,
            },
        })
        expect(receipt.fountainText).toContain('Recurrence-Rule:')
        expect(receipt.fountainText).toContain('Occurrence-Index: 2')
        expect(receipt.fountainText).toContain('Calendar-Weekday:')
        expect(receipt.fountainText).toContain('Lunar-Phase:')
        expect(receipt.fountainText).not.toContain('\r\n')
        for (let i = 0; i < receipt.fountainText.length; i += 1) {
            expect(receipt.fountainText.charCodeAt(i)).toBeLessThanOrEqual(127)
        }
    })
})
