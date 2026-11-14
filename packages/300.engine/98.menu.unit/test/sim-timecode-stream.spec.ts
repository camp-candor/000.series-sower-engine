import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    stepTick,
    fastForwardTicks,
    formatTimecodeBanner,
} from '../../00.engine.unit/buz/engine.buzz.js'
import { EngineModel } from '../../00.engine.unit/engine.model.js'
import { loadBibleStateForSeries } from '../buz/00.menu.buzz.js'
import {
    extractLoreChronology,
    advanceClockTicks,
} from '../../17.tick.unit/tick.reduce.js'

const TIMECODE_PATTERN =
    /^>> \[SIM:TIMECODE\] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| TC \d{2}:\d{2}:\d{2}:\d{2} \| DAYPART: (DAWN|MORNING|AFTERNOON|DUSK|NIGHT) \| TICK \d+ -> \d+$/

describe('live cns00 timecode telemetry stream', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('formats 7-bit ASCII timecode banners', () => {
        const clock = extractLoreChronology({
            chronology: { start_date: '2026-10-31', start_time: '21:00:00' },
        })
        const banner = formatTimecodeBanner(clock, 0, 1)
        expect(banner).toMatch(TIMECODE_PATTERN)
        for (let i = 0; i < banner.length; i += 1) {
            expect(banner.charCodeAt(i)).toBeLessThanOrEqual(127)
        }
    })

    it('streams monotonically advancing timecodes across tick bursts', async () => {
        const seen: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (
                type === '[Console action] Update Console' &&
                typeof bale?.src === 'string' &&
                bale.src.includes('[SIM:TIMECODE]')
            ) {
                seen.push(bale.src as string)
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const model = new EngineModel()
        const slv = vi.fn()
        stepTick(model, { idx: 'step-1', slv } as any, {} as any)
        await new Promise((resolve) => setTimeout(resolve, 10))
        stepTick(model, { idx: 'step-2', slv } as any, {} as any)
        await new Promise((resolve) => setTimeout(resolve, 10))
        fastForwardTicks(model, { idx: 'ff', slv } as any, {} as any)
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(seen.length).toBeGreaterThanOrEqual(3)
        for (const line of seen) {
            expect(line).toMatch(TIMECODE_PATTERN)
        }
        const parseTick = (line: string): number => {
            const m = /TICK \d+ -> (\d+)/.exec(line)
            return m?.[1] != null ? Number(m[1]) : -1
        }
        const ticks = seen.map(parseTick)
        for (let i = 1; i < ticks.length; i += 1) {
            expect(ticks[i]).toBeGreaterThan(ticks[i - 1] as number)
        }
    })

    it('starts bursts at exact bible-state start date and time', () => {
        const bibleState = {
            chronology: {
                start_date: '2026-10-31',
                start_time: '21:00:00',
                tick_seconds: 60,
                frames_per_second: 24,
            },
        }
        const clock = extractLoreChronology(bibleState)
        expect(clock.isoDate).toBe('2026-10-31')
        expect(clock.clockTimeHms).toBe('21:00:00')
        const next = advanceClockTicks(clock, 1)
        const banner = formatTimecodeBanner(next, 0, 1)
        expect(banner).toContain('2026-10-31 21:01:00')
    })

    it('resolves bible-state from disk candidates fail-closed', () => {
        const missing = loadBibleStateForSeries(
            '/definitely/not/a/real/root',
            'no-such-series',
        )
        expect(missing).toBeUndefined()
    })
})
