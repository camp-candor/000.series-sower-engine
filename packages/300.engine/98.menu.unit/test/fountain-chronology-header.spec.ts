import { describe, it, expect } from 'vitest'
import { buildSpatialHeaderAndFountainDraft } from '../buz/fountain-workflow-menu.buzz.js'
import { extractFountainChronologyHeaders } from '../../21.compile.unit/buz/fountain-ingress.buzz.js'
import { advanceClockTicks } from '../../17.tick.unit/tick.reduce.js'
import { extractLoreChronology } from '../../17.tick.unit/tick.reduce.js'

describe('fountain chronology header export', () => {
    it('emits Date and Start-Time near top of fountain', async () => {
        const built = await buildSpatialHeaderAndFountainDraft({
            seriesSlug: 'wiregrass-basin',
        })
        const lines = built.fountainText.split('\n')
        const dateIdx = lines.findIndex((l) => l.startsWith('Date:'))
        const startIdx = lines.findIndex((l) => l.startsWith('Start-Time:'))
        expect(dateIdx).toBeGreaterThanOrEqual(0)
        expect(dateIdx).toBeLessThan(15)
        expect(startIdx).toBeGreaterThanOrEqual(0)
        expect(startIdx).toBeLessThan(15)
        expect(lines[dateIdx]).toMatch(/^Date: \d{4}-\d{2}-\d{2}$/)
        expect(lines[startIdx]).toMatch(/^Start-Time: \d{2}:\d{2}$/)
        const sceneIdx = lines.findIndex((l) => /^(INT|EXT)\./.test(l.trim()))
        expect(dateIdx).toBeLessThan(sceneIdx)
        expect(startIdx).toBeLessThan(sceneIdx)
    })

    it('reflects tick-advanced scene start time', async () => {
        const base = extractLoreChronology({
            chronology: {
                start_date: '2026-10-31',
                start_time: '21:00:00',
                tick_seconds: 60,
            },
        })
        const advanced = advanceClockTicks(base, 60)
        expect(advanced.clockTimeHm).toBe('22:00')
        const built = await buildSpatialHeaderAndFountainDraft({
            seriesSlug: 'wiregrass-basin',
            chronology: advanced,
        })
        expect(built.fountainText).toContain(
            `Start-Time: ${advanced.clockTimeHm}`,
        )
        expect(built.fountainText).toContain(`Date: ${advanced.isoDate}`)
    })

    it('embeds spatial header scene chronology and daypart slugline', async () => {
        const built = await buildSpatialHeaderAndFountainDraft({
            seriesSlug: 'wiregrass-basin',
        })
        expect(built.fountainText).toContain('SCENE_START_DATE:')
        expect(built.fountainText).toContain('SCENE_START_TIME:')
        expect(built.fountainText).toContain('SCENE_TIMECODE:')
        expect(built.fountainText).toContain('SCENE_DAYPART:')
        const slug = built.fountainText
            .split('\n')
            .find((l) => /^(INT|EXT)\./.test(l.trim()))
        expect(slug).toBeTruthy()
        expect(slug as string).toContain(built.clock.daypart)
    })

    it('parses headers pure and fails closed on malformed dates', () => {
        const sample = [
            'Title: THE PARALLAX DINNER',
            'Series: wiregrass-basin',
            'Scene: ep01_sc01',
            'Date: 2026-10-31',
            'Start-Time: 21:00',
            'Timecode: 00:00:00:00',
            'Daypart: NIGHT',
            '',
            'INT. DINER - NIGHT',
        ].join('\n')
        const parsed = extractFountainChronologyHeaders(sample)
        expect(parsed.date).toBe('2026-10-31')
        expect(parsed.startTimeHm).toBe('21:00')
        expect(parsed.timecodeSmpte).toBe('00:00:00:00')
        expect(parsed.daypart).toBe('NIGHT')
        const legacy = [
            'Title: THE PARALLAX DINNER',
            '',
            'INT. DINER - NIGHT',
        ].join('\n')
        const legacyParsed = extractFountainChronologyHeaders(legacy)
        expect(legacyParsed.date).toBeUndefined()
        expect(() =>
            extractFountainChronologyHeaders(
                'Title: X\nDate: 2025-02-29\n\nINT. A - NIGHT',
            ),
        ).toThrowError(/INVALID_FOUNTAIN_HEADER_CHRONOLOGY/)
    })
})
