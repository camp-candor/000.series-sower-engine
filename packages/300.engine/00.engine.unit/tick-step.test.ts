import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    stepTick,
    fastForwardTicks,
    formatTickReceipt,
} from './buz/engine.buzz.js'
import { reduceTickStep } from '../17.tick.unit/tick.reduce.js'
import { toSimTime } from '../17.tick.unit/fce/tick.interface.js'
import { STEP_TICK, FAST_FORWARD_TICKS } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

const STEP_PATTERN =
    /^>> \[TICK_OK\] Advanced 1 tick in \d+\.\d{4}ms \(~\d+ ticks\/sec, tick \d+ -> \d+\)$/
const FF_PATTERN =
    /^>> \[TICK_OK\] Advanced 100 ticks in \d+\.\d{4}ms \(~\d+ ticks\/sec, tick \d+ -> \d+\)$/

const parseTickSpan = (src: string): { from: number; to: number } => {
    const match = src.match(/tick (\d+) -> (\d+)/)
    if (match == null || match[1] == null || match[2] == null)
        throw new Error('TICK receipt missing tick span')
    return { from: Number(match[1]), to: Number(match[2]) }
}

describe('tick step', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('advances exactly 1 tick with throughput telemetry', () => {
        const slv = vi.fn()
        const result = stepTick(
            new EngineModel(),
            { idx: 'step', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('step-tick-ok')
        expect(payload.fenBit.src).toMatch(STEP_PATTERN)
        const span = parseTickSpan(payload.fenBit.src as string)
        expect(span.to - span.from).toBe(1)
    })

    it('reduces deterministically: identical inputs yield identical outputs', () => {
        const payload = {
            tick: toSimTime(7),
            actors: [
                {
                    id: 'char_elias',
                    somatic_strain_bp: 4500,
                    paranoia_bp: 1200,
                    current_loc: 'loc_culvert',
                    busyUntil: toSimTime(7),
                },
            ],
            pending_actions: [{ actor_id: 'char_elias', verb: 'REST' }],
        }
        expect(reduceTickStep(payload)).toEqual(reduceTickStep(payload))
        expect(reduceTickStep(payload).tick).toBe(toSimTime(8))
    })

    it('fast-forwards exactly 100 ticks above 50,000 ticks/sec', () => {
        const slv = vi.fn()
        fastForwardTicks(
            new EngineModel(),
            { idx: 'fast-forward', slv } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        const src = slv.mock.calls[0][0].fenBit.src as string
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('fast-forward-ticks-ok')
        expect(src).toMatch(FF_PATTERN)
        const span = parseTickSpan(src)
        expect(span.to - span.from).toBe(100)
        const rate = src.match(/~(\d+) ticks\/sec/)
        if (rate == null || rate[1] == null)
            throw new Error('TICK receipt missing throughput telemetry')
        expect(Number(rate[1])).toBeGreaterThan(50000)
    })

    it('routes STEP_TICK and FAST_FORWARD_TICKS through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            { type: STEP_TICK, bale: { idx: 'step', slv } } as any,
            {} as any,
        )
        reducer(
            new EngineModel(),
            {
                type: FAST_FORWARD_TICKS,
                bale: { idx: 'fast-forward', slv },
            } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledTimes(2)
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('step-tick-ok')
        expect(slv.mock.calls[1][0].fenBit.idx).toBe('fast-forward-ticks-ok')
    })

    it('streams the tick receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: ' Step 1 Tick' } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: formatTickReceipt(1, 41, 42, 0.0031) },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain(' Step 1 Tick')
        expect(choiceList).toContain(' Fast Forward 100 Ticks')
        expect(engineHunt).toHaveBeenCalledWith(STEP_TICK, {})
        const tickLine = consoles.find(
            (c) => c.idx === 'cns00' && STEP_PATTERN.test(c.src),
        )
        expect(tickLine).toBeTruthy()
    }, 10000)
})
