import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    bankersRoundingSuite,
    BANKERS_RECEIPT_LINES,
} from './buz/engine.buzz.js'
import { BANKERS_ROUNDING_SUITE } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

const EXPECTED_LINES = [
    '>> [ARITHMETIC:STATE] Initializing ArithmeticModel scratchpad container...',
    ">> [ROUNDING:AUDIT] Ingesting 4-case Banker's Rounding integer kernel...",
    '>> [BRANCH:1] Remainder R < 5,000 truncation verified (Q = 2, R = 0 -> 2).',
    '>> [BRANCH:2] Remainder R > 5,000 increment verified (Q = 2, R = 7,500 -> 3).',
    '>> [BRANCH:3] Remainder R = 5,000 even tie verified (Q = 2, R = 5,000 -> 2).',
    '>> [BRANCH:4] Remainder R = 5,000 odd tie verified (Q = 3, R = 5,000 -> 4).',
    '>> [OVERFLOW:GUARD] MAX_SAFE_INTEGER bounds checking active.',
    '>> [STATE:FREEZE] Arithmetic receipts sealed with Object.freeze(). Status: PASS.',
]

describe('bankers rounding suite', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('emits all eight exact rounding telemetry lines', () => {
        const slv = vi.fn()
        const result = bankersRoundingSuite(
            new EngineModel(),
            { idx: 'bankers', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('bankers-rounding-suite-ok')
        expect([...BANKERS_RECEIPT_LINES]).toEqual(EXPECTED_LINES)
        expect(payload.fenBit.src).toBe(EXPECTED_LINES.join('\n'))
    })

    it('reports a clean dat contract on pass', () => {
        const slv = vi.fn()
        bankersRoundingSuite(
            new EngineModel(),
            { idx: 'bankers', slv } as any,
            {} as any,
        )
        const dat = slv.mock.calls[0][0].fenBit.dat
        expect(dat.ok).toBe(true)
        expect(dat.detail).toBe('4-case kernel verified end-to-end')
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(
            bankersRoundingSuite(model, { idx: 'bankers' } as any, {} as any),
        ).toBe(model)
    })

    it('routes BANKERS_ROUNDING_SUITE through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            {
                type: BANKERS_ROUNDING_SUITE,
                bale: { idx: 'bankers', slv },
            } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe(
            'bankers-rounding-suite-ok',
        )
    })

    it('streams the suite receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: "EXECUTE BANKER'S ROUNDING SUITE" } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: [...BANKERS_RECEIPT_LINES].join('\n') },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain("EXECUTE BANKER'S ROUNDING SUITE")
        expect(choiceList).toContain(' Execute Banker Rounding Suite')
        expect(engineHunt).toHaveBeenCalledWith(BANKERS_ROUNDING_SUITE, {})
        for (const line of EXPECTED_LINES) {
            expect(
                consoles.some(
                    (c) =>
                        c.idx === 'cns00' && (c.src as string).includes(line),
                ),
            ).toBe(true)
        }
    }, 10000)
})
