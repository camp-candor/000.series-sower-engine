import { describe, expect, it } from 'vitest'
import {
    synthesizeEventFountainScreenplay,
    verifySixFountainCategories,
} from '../buz/eventFountainSynth.buzz.js'

const baseEvent = {
    eventSequence: 1,
    tick: 6,
    clockSnapshot: {
        isoDate: '2026-10-31',
        clockTimeHm: '23:30',
        clockTimeHms: '23:30:00',
        timecodeSmpte: '00:00:00:00',
        daypart: 'NIGHT',
    },
    category: 'GRIEVANCE_BREACH' as const,
    severityBps: 9000,
    triggerReason: 'Scheduled agenda curfew_2330 Midnight Curfew Tribunal',
    actorsInvolved: ['char_bog', 'char_wart'] as readonly string[],
    locationId: 'loc_culvert',
    stateDeltaSummary: 'agenda curfew_2330 triggered',
    causalHash: 'ab'.repeat(32),
    agendaScheduled: true,
    agendaBeatId: 'curfew_2330',
    agendaTitle: 'Midnight Curfew Tribunal',
    scheduledIsoDate: '2026-10-31',
    scheduledTimeHm: '23:30',
    scheduledTimestamp: '2026-10-31 23:30',
    reserveHeldTicks: 2,
}

describe('fountain agenda stamp', () => {
    it('emits agenda metadata headers with pure ascii', () => {
        const receipt = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'auto_seed01',
            significantEvent: baseEvent,
            clockBefore: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:15',
                clockTimeHms: '23:15:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
            },
            clockAfter: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:30',
                clockTimeHms: '23:30:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
                tickSeconds: 900,
            },
        })
        expect(receipt.fountainText).toContain('Agenda-Beat-Id: curfew_2330')
        expect(receipt.fountainText).toContain(
            'Scheduled-Time: 2026-10-31 23:30',
        )
        expect(receipt.fountainText).toContain('Reserve-Held-Ticks: 2')
        expect(receipt.fountainText).toContain('Midnight Curfew Tribunal')
        expect(receipt.fountainText).toContain('Date:')
        expect(receipt.fountainText).toContain('Start-Time:')
        for (const ch of receipt.fountainText) {
            expect(ch.charCodeAt(0)).toBeLessThanOrEqual(127)
        }
    })

    it('passes six fountain categories for scheduled scripts', () => {
        const receipt = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'auto_seed01',
            significantEvent: baseEvent,
            clockBefore: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:15',
                clockTimeHms: '23:15:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
            },
            clockAfter: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:30',
                clockTimeHms: '23:30:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
                tickSeconds: 900,
            },
        })
        expect(verifySixFountainCategories(receipt.fountainText).allValid).toBe(
            true,
        )
    })

    it('persists agenda metadata in scene summary ast', () => {
        const receipt = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'auto_seed01',
            significantEvent: baseEvent,
            clockBefore: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:15',
                clockTimeHms: '23:15:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
            },
            clockAfter: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:30',
                clockTimeHms: '23:30:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
                tickSeconds: 900,
            },
        })
        const ast = receipt.sceneSummaryAst as unknown as Record<
            string,
            unknown
        >
        const chrono = ast['chronology'] as Record<string, unknown>
        const agenda = chrono['agenda'] as Record<string, unknown>
        expect(agenda['agendaBeatId']).toBe('curfew_2330')
        expect(agenda['scheduledTimeHm']).toBe('23:30')
        expect(agenda['reserveHeldTicks']).toBe(2)
    })

    it('omits agenda headers for non-scheduled events', () => {
        const receipt = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'auto_seed01',
            significantEvent: {
                ...baseEvent,
                agendaScheduled: false,
                agendaBeatId: undefined,
                agendaTitle: undefined,
            },
            clockBefore: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:15',
                clockTimeHms: '23:15:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
            },
            clockAfter: {
                isoDate: '2026-10-31',
                clockTimeHm: '23:30',
                clockTimeHms: '23:30:00',
                timecodeSmpte: '00:00:00:00',
                daypart: 'NIGHT',
                tickSeconds: 900,
            },
        })
        expect(receipt.fountainText).not.toContain('Agenda-Beat-Id:')
        expect(verifySixFountainCategories(receipt.fountainText).allValid).toBe(
            true,
        )
    })
})
