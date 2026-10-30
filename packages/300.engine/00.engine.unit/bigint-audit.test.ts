import { describe, it, expect, vi, afterEach } from 'vitest'
import { bigintAudit, BIGINT_RECEIPT_LINES } from './buz/engine.buzz.js'
import { BIGINT_AUDIT } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

const EXPECTED_LINES = [
    '>> [BIGINT:AUDIT] Ingesting 64-Bit Arbitrary Precision Kernel...',
    '>> [BIGINT:OVERFLOW] Multi-century intermediate product (2.7e18) verified (> 2^53 - 1).',
    '>> [BIGINT:INTERCEPT] Analytical meeting formula solved with zero truncation.',
    '>> [BIGINT:TIE_EVEN] 1n/2n -> 0n, 3n/2n -> 2n, 5n/2n -> 2n, 7n/2n -> 4n (PASS).',
    '>> [BIGINT:PARITY] 100% mathematical bit parity with 32-bit functions confirmed.',
    '>> [KERNEL:SEALED] High-magnitude precision certified at T_0 = $0.00.',
]

describe('bigint audit suite', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('emits all six exact bigint telemetry lines', () => {
        const slv = vi.fn()
        const result = bigintAudit(
            new EngineModel(),
            { idx: 'bigint', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('bigint-audit-ok')
        expect([...BIGINT_RECEIPT_LINES]).toEqual(EXPECTED_LINES)
        expect(payload.fenBit.src).toBe(EXPECTED_LINES.join('\n'))
    })

    it('reports a clean dat contract on pass', () => {
        const slv = vi.fn()
        bigintAudit(new EngineModel(), { idx: 'bigint', slv } as any, {} as any)
        const dat = slv.mock.calls[0][0].fenBit.dat
        expect(dat.ok).toBe(true)
        expect(dat.detail).toBe('bigint precision verified end-to-end')
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(bigintAudit(model, { idx: 'bigint' } as any, {} as any)).toBe(
            model,
        )
    })

    it('routes BIGINT_AUDIT through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            {
                type: BIGINT_AUDIT,
                bale: { idx: 'bigint', slv },
            } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('bigint-audit-ok')
    })

    it('streams the bigint receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return {
                    chcBit: { src: 'EXECUTE BIGINT PRECISION SUITE' },
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
            fenBit: { src: [...BIGINT_RECEIPT_LINES].join('\n') },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain('EXECUTE BIGINT PRECISION SUITE')
        expect(consoles.length).toBeGreaterThan(0)
        expect(consoles.some((c) => c.src?.includes('>> [BIGINT:AUDIT]'))).toBe(
            true,
        )
        expect(
            consoles.some((c) => c.src?.includes('>> [KERNEL:SEALED]')),
        ).toBe(true)
    })
})
