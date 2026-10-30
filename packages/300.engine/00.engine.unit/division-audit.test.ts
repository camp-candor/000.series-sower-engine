import { describe, it, expect, vi, afterEach } from 'vitest'
import { divisionAudit, DIVISION_RECEIPT_LINES } from './buz/engine.buzz.js'
import { DIVISION_AUDIT } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

const EXPECTED_LINES = [
    '>> [DIV_EVEN:AUDIT] Ingesting Arbitrary Integer Division Kernel...',
    '>> [DIV_EVEN:ZERO_GUARD] Division by zero intercepted with [DIV_ZERO].',
    '>> [DIV_EVEN:FLOAT_GUARD] Fractional inputs rejected with [FLOAT_PROHIBITED].',
    '>> [DIV_EVEN:TIE_EVEN] 1/2 -> 0, 3/2 -> 2, 5/2 -> 2, 7/2 -> 4 (PASS).',
    '>> [DIV_EVEN:TIE_NEG] -1/2 -> 0, -3/2 -> -2, -5/2 -> -2, -7/2 -> -4 (PASS).',
    '>> [DIV_EVEN:SYMMETRY] Negative denominator sign normalization verified.',
    '>> [KERNEL:SEALED] Arbitrary integer division certified at T_0 = $0.00.',
]

describe('division audit suite', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('emits all seven exact division telemetry lines', () => {
        const slv = vi.fn()
        const result = divisionAudit(
            new EngineModel(),
            { idx: 'division', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('division-audit-ok')
        expect([...DIVISION_RECEIPT_LINES]).toEqual(EXPECTED_LINES)
        expect(payload.fenBit.src).toBe(EXPECTED_LINES.join('\n'))
    })

    it('reports a clean dat contract on pass', () => {
        const slv = vi.fn()
        divisionAudit(
            new EngineModel(),
            { idx: 'division', slv } as any,
            {} as any,
        )
        const dat = slv.mock.calls[0][0].fenBit.dat
        expect(dat.ok).toBe(true)
        expect(dat.detail).toBe(
            'arbitrary integer division verified end-to-end',
        )
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(
            divisionAudit(model, { idx: 'division' } as any, {} as any),
        ).toBe(model)
    })

    it('routes DIVISION_AUDIT through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            {
                type: DIVISION_AUDIT,
                bale: { idx: 'division', slv },
            } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('division-audit-ok')
    })

    it('streams the division receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return {
                    chcBit: { src: 'ARBITRARY INTEGER DIVISION SUITE' },
                }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: [...DIVISION_RECEIPT_LINES].join('\n') },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain('ARBITRARY INTEGER DIVISION SUITE')
        expect(choiceList).toContain(' Arbitrary Integer Division Suite')
        expect(engineHunt).toHaveBeenCalledWith(DIVISION_AUDIT, {})
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
