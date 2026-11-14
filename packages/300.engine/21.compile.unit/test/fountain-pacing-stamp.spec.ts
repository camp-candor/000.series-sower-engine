import { describe, expect, it } from 'vitest'
import {
    synthesizeEventFountainScreenplay,
    verifySixFountainCategories,
} from '../buz/eventFountainSynth.buzz.js'

const baseEvent = {
    eventSequence: 1,
    tick: 80,
    clockSnapshot: {
        isoDate: '2026-11-01',
        clockTimeHm: '06:00',
        clockTimeHms: '06:00:00',
        timecodeSmpte: '06:00:00:00',
        daypart: 'DAWN',
    },
    category: 'GRIEVANCE_BREACH' as const,
    severityBps: 7000,
    triggerReason: 'grievance breach at dawn',
    actorsInvolved: ['char_bog', 'char_wart'] as readonly string[],
    locationId: 'loc_culvert',
    stateDeltaSummary: 'grievance ACTIVE -> ESCALATED',
    causalHash:
        'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
}

const clockOf = (isoDate: string, hm: string, daypart: string) => ({
    isoDate,
    clockTimeHm: hm,
    clockTimeHms: `${hm}:00`,
    timecodeSmpte: '06:00:00:00',
    daypart,
})

describe('21.compile.unit - Fountain Pacing Stamps', () => {
    it('injects pure ASCII pacing headers alongside date headers', () => {
        const screenplay = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'auto_wiregrass_seed01',
            significantEvent: baseEvent,
            pacing: {
                actStage: 'ACT_III',
                actMultiplierBps: 14500,
                diurnalWeightBps: 12500,
                droughtTicks: 7,
                droughtBreaker: true,
                cooldownWindowTicks: 3,
            },
            clockBefore: clockOf('2026-11-01', '06:00', 'DAWN'),
            clockAfter: {
                ...clockOf('2026-11-01', '06:00', 'DAWN'),
                tickSeconds: 900,
            },
        })
        expect(screenplay.fountainText).toContain('Act: ACT_III')
        expect(screenplay.fountainText).toContain(
            'Pacing-Multiplier-Bps: 14500',
        )
        expect(screenplay.fountainText).toContain('Diurnal-Weight-Bps: 12500')
        expect(screenplay.fountainText).toContain('Drought-Ticks: 7')
        expect(screenplay.fountainText).toContain('Date: 2026-11-01')
        expect(screenplay.fountainText).toContain('Start-Time: 06:00')
        expect(screenplay.fountainText).toContain('End-Time: 06:00')
        expect(screenplay.fountainText).toContain('Timecode:')
        expect(screenplay.fountainText).toContain('Daypart:')
        for (const ch of screenplay.fountainText) {
            expect(ch.charCodeAt(0)).toBeLessThanOrEqual(127)
        }
        expect(
            verifySixFountainCategories(screenplay.fountainText).allValid,
        ).toBe(true)
        const pacing = (
            screenplay.sceneSummaryAst as unknown as {
                pacing: { actStage: string }
            }
        ).pacing
        expect(pacing.actStage).toBe('ACT_III')
    })

    it('shifts transitions by act while preserving six categories', () => {
        const actI = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'auto_wiregrass_seed01',
            significantEvent: { ...baseEvent, tick: 5 },
            pacing: {
                actStage: 'ACT_I',
                actMultiplierBps: 8000,
                diurnalWeightBps: 10000,
                droughtTicks: 0,
                droughtBreaker: false,
                cooldownWindowTicks: 3,
            },
            clockBefore: clockOf('2026-10-31', '21:00', 'NIGHT'),
            clockAfter: {
                ...clockOf('2026-10-31', '21:00', 'NIGHT'),
                tickSeconds: 900,
            },
        })
        const actIII = synthesizeEventFountainScreenplay({
            seriesSlug: 'wiregrass-basin',
            masterSeed: 'auto_wiregrass_seed01',
            significantEvent: { ...baseEvent, tick: 90 },
            pacing: {
                actStage: 'ACT_III',
                actMultiplierBps: 14500,
                diurnalWeightBps: 12500,
                droughtTicks: 7,
                droughtBreaker: true,
                cooldownWindowTicks: 3,
            },
            clockBefore: clockOf('2026-11-01', '06:00', 'DAWN'),
            clockAfter: {
                ...clockOf('2026-11-01', '06:00', 'DAWN'),
                tickSeconds: 900,
            },
        })
        expect(verifySixFountainCategories(actI.fountainText).allValid).toBe(
            true,
        )
        expect(verifySixFountainCategories(actIII.fountainText).allValid).toBe(
            true,
        )
        expect(actI.fountainText).toContain('Act: ACT_I')
        expect(actIII.fountainText).toContain('Act: ACT_III')
        expect(
            actIII.fountainText.includes('SMASH CUT TO:') ||
                actIII.fountainText.includes('MATCH CUT TO:'),
        ).toBe(true)
    })
})
