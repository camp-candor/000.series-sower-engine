import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    arithmeticAudit,
    ARITHMETIC_AUDIT_INGEST,
    ARITHMETIC_AUDIT_OK,
} from './buz/engine.buzz.js'
import { ARITHMETIC_AUDIT } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

describe('arithmetic audit', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('emits both exact arithmetic telemetry lines', () => {
        const slv = vi.fn()
        const result = arithmeticAudit(
            new EngineModel(),
            { idx: 'arithmetic', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('arithmetic-audit-ok')
        expect(ARITHMETIC_AUDIT_INGEST).toBe(
            '>> [ARITHMETIC:AUDIT] Ingesting Basis Point Rounding Contracts...',
        )
        expect(ARITHMETIC_AUDIT_OK).toBe(
            '>> [ARITHMETIC:OK] Float rejection asserted on all BasisPoint types.',
        )
        expect(payload.fenBit.src).toContain(ARITHMETIC_AUDIT_INGEST)
        expect(payload.fenBit.src).toContain(ARITHMETIC_AUDIT_OK)
    })

    it('reports a clean dat contract on pass', () => {
        const slv = vi.fn()
        arithmeticAudit(
            new EngineModel(),
            { idx: 'arithmetic', slv } as any,
            {} as any,
        )
        const dat = slv.mock.calls[0][0].fenBit.dat
        expect(dat.ok).toBe(true)
        expect(dat.detail).toBe('all guards rejected adversarial inputs')
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(
            arithmeticAudit(model, { idx: 'arithmetic' } as any, {} as any),
        ).toBe(model)
    })

    it('routes ARITHMETIC_AUDIT through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            { type: ARITHMETIC_AUDIT, bale: { idx: 'arithmetic', slv } } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('arithmetic-audit-ok')
    })

    it('streams both telemetry lines to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: 'ARITHMETIC KERNEL AUDIT' } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: {
                src: `${ARITHMETIC_AUDIT_INGEST}\n${ARITHMETIC_AUDIT_OK}`,
            },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain('ARITHMETIC KERNEL AUDIT')
        expect(choiceList).toContain(' Arithmetic Kernel Audit')
        expect(engineHunt).toHaveBeenCalledWith(ARITHMETIC_AUDIT, {})
        const auditLines = consoles.filter(
            (c) =>
                c.idx === 'cns00' &&
                (c.src as string).includes(ARITHMETIC_AUDIT_INGEST),
        )
        expect(auditLines.length).toBeGreaterThan(0)
        expect(
            consoles.some(
                (c) =>
                    c.idx === 'cns00' &&
                    (c.src as string).includes(ARITHMETIC_AUDIT_OK),
            ),
        ).toBe(true)
    }, 10000)
})
