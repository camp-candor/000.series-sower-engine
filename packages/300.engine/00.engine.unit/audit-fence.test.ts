import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    auditFence,
    scanRootDependencies,
    findMonorepoRoot,
    AUDIT_FENCE_OK,
} from './buz/engine.buzz.js'
import { AUDIT_FENCE } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

describe('audit fence', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('scans manifests for runtime dependencies', () => {
        expect(scanRootDependencies({})).toEqual([])
        expect(scanRootDependencies({ dependencies: null })).toEqual([])
        expect(
            scanRootDependencies({ dependencies: { react: '18.2.0' } }),
        ).toEqual(['react'])
        expect(scanRootDependencies(null)).toEqual(['unreadable manifest'])
        expect(scanRootDependencies({ dependencies: 'nope' })).toEqual([
            'malformed dependencies block',
        ])
    })

    it('locates the monorepo root by workspace marker', () => {
        const root = findMonorepoRoot(process.cwd())
        expect(root).not.toBeNull()
    })

    it('resolves the OK receipt against a clean root manifest', () => {
        const slv = vi.fn()
        const result = auditFence(
            new EngineModel(),
            { idx: 'audit', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('audit-fence-ok')
        expect(payload.fenBit.src).toBe(AUDIT_FENCE_OK)
        expect(payload.fenBit.src).toBe(
            '>> [OK] Zero root runtime dependencies verified',
        )
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(auditFence(model, { idx: 'audit' } as any, {} as any)).toBe(
            model,
        )
    })

    it('routes AUDIT_FENCE through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            { type: AUDIT_FENCE, bale: { idx: 'audit', slv } } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('audit-fence-ok')
    })

    it('streams the fence receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: ' Audit Fence' } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: AUDIT_FENCE_OK },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain(' Audit Fence')
        expect(engineHunt).toHaveBeenCalledWith(AUDIT_FENCE, {})
        const fenceLine = consoles.find(
            (c) => c.idx === 'cns00' && c.src === AUDIT_FENCE_OK,
        )
        expect(fenceLine).toBeTruthy()
    }, 10000)
})
