import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
    checkArtifacts,
    scanArtifactDir,
    findMonorepoRoot,
    CHECK_ARTIFACTS_OK,
} from './buz/engine.buzz.js'
import { CHECK_ARTIFACTS } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

describe('check artifacts', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('scans directories for leaked compilation artifacts', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-artifacts-'))
        try {
            expect(scanArtifactDir(dir)).toEqual([])
            fs.writeFileSync(path.join(dir, 'rogue.js'), 'leaked')
            fs.writeFileSync(path.join(dir, 'rogue.d.ts'), 'leaked')
            fs.writeFileSync(path.join(dir, 'clean.ts'), 'clean')
            const leaked = scanArtifactDir(dir)
            expect(leaked.length).toBe(2)
            expect(leaked.some((p) => p.endsWith('rogue.js'))).toBe(true)
            expect(leaked.some((p) => p.endsWith('rogue.d.ts'))).toBe(true)
        } finally {
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

    it('skips node_modules, dist, and config scripts', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-artifacts-'))
        try {
            fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true })
            fs.mkdirSync(path.join(dir, 'dist'), { recursive: true })
            fs.writeFileSync(path.join(dir, 'node_modules', 'dep.js'), 'dep')
            fs.writeFileSync(path.join(dir, 'dist', 'out.js'), 'out')
            fs.writeFileSync(path.join(dir, 'vitest.config.js'), 'config')
            expect(scanArtifactDir(dir)).toEqual([])
        } finally {
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

    it('locates the engine source dir under the monorepo root', () => {
        const root = findMonorepoRoot(process.cwd())
        expect(root).not.toBeNull()
        if (root == null) return
        expect(fs.existsSync(path.join(root, 'packages', '300.engine'))).toBe(
            true,
        )
    })

    it('resolves the OK receipt against a clean engine tree', () => {
        const slv = vi.fn()
        const result = checkArtifacts(
            new EngineModel(),
            { idx: 'audit', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('check-artifacts-ok')
        expect(payload.fenBit.src).toBe(CHECK_ARTIFACTS_OK)
        expect(payload.fenBit.src).toBe(
            '>> [OK] Zero leaked compilation artifacts in packages/300.engine',
        )
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(checkArtifacts(model, { idx: 'audit' } as any, {} as any)).toBe(
            model,
        )
    })

    it('routes CHECK_ARTIFACTS through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            { type: CHECK_ARTIFACTS, bale: { idx: 'audit', slv } } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('check-artifacts-ok')
    })

    it('streams the artifacts receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: ' Check Artifacts' } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: CHECK_ARTIFACTS_OK },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain(' Check Artifacts')
        expect(engineHunt).toHaveBeenCalledWith(CHECK_ARTIFACTS, {})
        const artifactsLine = consoles.find(
            (c) => c.idx === 'cns00' && c.src === CHECK_ARTIFACTS_OK,
        )
        expect(artifactsLine).toBeTruthy()
    }, 10000)
})
