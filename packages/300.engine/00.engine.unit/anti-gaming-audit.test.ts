import { describe, it, expect, vi, afterEach } from 'vitest'
import { antiGamingAudit, ANTI_GAMING_SUCCESS } from './buz/engine.buzz.js'
import { ANTI_GAMING_AUDIT } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

const EXPECTED_OVERLAY_LINES = [
    '>> [ANTI-GAMING] Initializing dynamic held-out test overlay against ref: HEAD',
    '>> [RESTORED] Engine unit test battery -> packages/300.engine/00.engine.unit/test',
    '>> [RESTORED] Tick reduction budget test -> packages/300.engine/17.tick.unit/tick.spec.ts',
    '>> [RESTORED] Engine test matchers & fixtures -> packages/300.engine/test',
    '>> [RESTORED] AST architectural firewall -> .dependency-cruiser.cjs',
    '>> [RESTORED] Multi-pool test runner configuration -> vitest.workspace.ts',
    '>> [PASS] Dynamic held-out test overlay complete. Authoritative baseline locked.',
    ANTI_GAMING_SUCCESS,
]

const assertOrderedLines = (src: string) => {
    let cursor = -1
    for (const line of EXPECTED_OVERLAY_LINES) {
        const idx = src.indexOf(line, cursor + 1)
        expect(idx).toBeGreaterThan(cursor)
        cursor = idx
    }
}

describe('anti gaming overlay audit', { timeout: 60000 }, () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('resolves the OK receipt against a clean overlay baseline', () => {
        const slv = vi.fn()
        const result = antiGamingAudit(
            new EngineModel(),
            { idx: 'anti-gaming', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('anti-gaming-ok')
        assertOrderedLines(payload.fenBit.src as string)
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(
            antiGamingAudit(model, { idx: 'anti-gaming' } as any, {} as any),
        ).toBe(model)
    })

    it('routes ANTI_GAMING_AUDIT through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            {
                type: ANTI_GAMING_AUDIT,
                bale: { idx: 'anti-gaming', slv },
            } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('anti-gaming-ok')
    })

    it('streams the overlay receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: ' Audit Anti-Gaming Overlay' } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: EXPECTED_OVERLAY_LINES.join('\n') },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain(' Audit Anti-Gaming Overlay')
        expect(choiceList).toContain('AUDIT ANTI-GAMING OVERLAY')
        expect(engineHunt).toHaveBeenCalledWith(ANTI_GAMING_AUDIT, {})
        const blob = consoles
            .filter((c) => c.idx === 'cns00')
            .map((c) => c.src as string)
            .join('\n')
        for (const line of EXPECTED_OVERLAY_LINES) {
            expect(blob.includes(line)).toBe(true)
        }
    }, 10000)
})
