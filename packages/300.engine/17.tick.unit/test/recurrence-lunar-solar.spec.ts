import { describe, expect, it } from 'vitest'
import {
    computeEngineLunarPhaseSnapshot,
    resolveEngineSolarMarker,
    matchesLunarOrSolarRecurrence,
    matchesBeatRecurrenceOnDate,
    SYNODIC_MONTH_SECONDS,
    REF_NEW_MOON_SEC,
} from '../buz/tick.buzz.js'

describe('phase three lunar solar matcher', () => {
    it('exposes synodic constants', () => {
        expect(SYNODIC_MONTH_SECONDS).toBe(2551443)
        expect(REF_NEW_MOON_SEC).toBe(947182440)
    })
    it('computes frozen lunar snapshot', () => {
        const snap = computeEngineLunarPhaseSnapshot('2026-10-31', '00:00')
        expect(Object.isFrozen(snap)).toBe(true)
        expect(snap.ageSeconds).toBeGreaterThanOrEqual(0)
        expect(snap.cycleProgressBps).toBeGreaterThanOrEqual(0)
        expect(snap.cycleProgressBps).toBeLessThanOrEqual(10000)
        expect(snap.illuminationBps).toBeGreaterThanOrEqual(0)
        expect(snap.illuminationBps).toBeLessThanOrEqual(10000)
    })
    it('maps solar markers exactly', () => {
        expect(resolveEngineSolarMarker('2026-03-20')).toBe('VERNAL_EQUINOX')
        expect(resolveEngineSolarMarker('2026-06-21')).toBe('SUMMER_SOLSTICE')
        expect(resolveEngineSolarMarker('2026-09-22')).toBe('AUTUMN_EQUINOX')
        expect(resolveEngineSolarMarker('2026-12-21')).toBe('WINTER_SOLSTICE')
        expect(resolveEngineSolarMarker('2026-10-31')).toBeNull()
    })
    it('matches lunar beats on exact phase', () => {
        const probe = computeEngineLunarPhaseSnapshot('2026-11-05', '09:00')
        const beat = Object.freeze({
            beat_id: 'moon_rite',
            title: 'Moon Rite',
            isoDate: '2026-11-01',
            startTimeHm: '09:00',
            beatCategory: 'EPISTEMIC_REVEAL',
            priorityBps: 5000,
            reserveCooldownTicks: 0,
            recurrenceRule: {
                frequency: 'LUNAR_PHASE',
                lunarPhase: probe.phase,
                blackoutDates: [],
                blackoutWeekdays: [],
                blackoutShiftPolicy: 'SKIP',
            },
        }) as never
        expect(matchesLunarOrSolarRecurrence(beat, '2026-11-05')).toBe(true)
        expect(matchesBeatRecurrenceOnDate(beat, '2026-11-05')).toBe(true)
    })
    it('matches solar beats on marker dates', () => {
        const beat = Object.freeze({
            beat_id: 'winter_fest',
            title: 'Winter Fest',
            isoDate: '2026-12-01',
            startTimeHm: '12:00',
            beatCategory: 'CHRONO_MILESTONE',
            priorityBps: 5000,
            reserveCooldownTicks: 0,
            recurrenceRule: {
                frequency: 'SOLAR_SOLSTICE_EQUINOX',
                solarMarkers: ['WINTER_SOLSTICE'],
                blackoutDates: [],
                blackoutWeekdays: [],
                blackoutShiftPolicy: 'SKIP',
            },
        }) as never
        expect(matchesBeatRecurrenceOnDate(beat, '2026-12-21')).toBe(true)
        expect(matchesBeatRecurrenceOnDate(beat, '2026-12-22')).toBe(false)
    })
})
