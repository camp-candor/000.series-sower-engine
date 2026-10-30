import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
    auditBoundary,
    findMonorepoRoot,
    AUDIT_BOUNDARY_OK,
} from './buz/engine.buzz.js'
import { AUDIT_BOUNDARY } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

describe('audit boundary', { timeout: 15000 }, () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('locates the monorepo root by workspace marker', () => {
        const root = findMonorepoRoot(process.cwd())
        expect(root).not.toBeNull()
        if (root == null) return
        expect(fs.existsSync(path.join(root, '.dependency-cruiser.cjs'))).toBe(
            true,
        )
    })

    it('resolves the OK receipt against a clean AST boundary', () => {
        const slv = vi.fn()
        const result = auditBoundary(
            new EngineModel(),
            { idx: 'audit', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('audit-boundary-ok')
        expect(payload.fenBit.src).toBe(AUDIT_BOUNDARY_OK)
        expect(payload.fenBit.src).toBe(
            '>> [OK] Zero AST boundary violations detected across simulation packages',
        )
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(auditBoundary(model, { idx: 'audit' } as any, {} as any)).toBe(
            model,
        )
    })

    it('routes AUDIT_BOUNDARY through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            { type: AUDIT_BOUNDARY, bale: { idx: 'audit', slv } } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('audit-boundary-ok')
    })

    it('streams the boundary receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: ' Audit Boundary' } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: AUDIT_BOUNDARY_OK },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain(' Audit Boundary')
        expect(engineHunt).toHaveBeenCalledWith(AUDIT_BOUNDARY, {})
        const boundaryLine = consoles.find(
            (c) => c.idx === 'cns00' && c.src === AUDIT_BOUNDARY_OK,
        )
        expect(boundaryLine).toBeTruthy()
    }, 10000)
})
