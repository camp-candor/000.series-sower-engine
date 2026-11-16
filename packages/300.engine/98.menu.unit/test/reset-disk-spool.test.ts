import { describe, it, expect, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MenuModel } from '../menu.model.js'
import {
    scanEngineBlastRadius,
    purgeCompiledUniversesSpool,
    purgeFountainDraftsSpool,
    purgeConductorExportSpool,
    purgeLocalSqliteSpool,
} from '../buz/reset-menu.buzz.js'

describe('Phase 4: Local Disk Spool Obliteration & Blast-Radius Scanner', () => {
    const tempDirs: string[] = []

    afterEach(() => {
        delete (globalThis as any).LAST_STAGED_FOUNTAIN_PATH
        while (tempDirs.length > 0) {
            const dir = tempDirs.pop()!
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

    function seedSyntheticSpools(sandbox: string): void {
        // 1. Seed compiled/ universe
        const universeDir = path.join(
            sandbox,
            'compiled',
            'gotham-trinity-crisis',
        )
        fs.mkdirSync(universeDir, { recursive: true })
        fs.writeFileSync(
            path.join(universeDir, 'bible-state.json'),
            '{"seriesSlug":"gotham-trinity-crisis"}',
            'utf8',
        )

        // 2. Seed drafts/ (.fountain + dialogue_ast.json + auto-script/)
        const draftsDir = path.join(sandbox, 'drafts')
        const autoScriptDir = path.join(
            draftsDir,
            'auto-script',
            'gotham-trinity-crisis',
        )
        fs.mkdirSync(autoScriptDir, { recursive: true })
        fs.writeFileSync(
            path.join(draftsDir, 'active_scene.fountain'),
            'EXT. GOTHAM ROOFTOP - NIGHT\n',
            'utf8',
        )
        fs.writeFileSync(
            path.join(autoScriptDir, 'ep01_sc01.fountain'),
            'INT. CLOCKTOWER - NIGHT\n',
            'utf8',
        )
        fs.writeFileSync(
            path.join(draftsDir, 'dialogue_ast.json'),
            '{"lines":[]}',
            'utf8',
        )

        // 3. Seed conductor_export/
        const exportDir = path.join(sandbox, 'conductor_export', 'drafts')
        fs.mkdirSync(exportDir, { recursive: true })
        fs.writeFileSync(
            path.join(exportDir, 'active_scene.fountain'),
            'EXT. GOTHAM ROOFTOP - NIGHT\n',
            'utf8',
        )

        // 4. Seed data/sqlite/
        const sqliteDir = path.join(sandbox, 'data', 'sqlite')
        fs.mkdirSync(sqliteDir, { recursive: true })
        fs.writeFileSync(
            path.join(sqliteDir, 'gotham.local.db'),
            'SQLITE_DUMMY',
            'utf8',
        )
        fs.writeFileSync(
            path.join(sqliteDir, 'gotham.local.db-wal'),
            'WAL_DUMMY',
            'utf8',
        )

        // 5. Seed protected directory to prove zero collateral damage
        const protectedDir = path.join(sandbox, 'data', 'directive', 'day-000')
        fs.mkdirSync(protectedDir, { recursive: true })
        fs.writeFileSync(
            path.join(protectedDir, '000.focus.cpn'),
            'PROTECTED',
            'utf8',
        )
    }

    it('scans blast-radius inventory non-destructively and purges all 4 runtime spools cleanly', async () => {
        const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-spool-'))
        tempDirs.push(sandbox)
        seedSyntheticSpools(sandbox)

        const menuModel = new MenuModel()
        menuModel.discoveredUniverses = [
            {
                seriesSlug: 'gotham-trinity-crisis',
                manifestPath: path.join(
                    sandbox,
                    'compiled',
                    'gotham-trinity-crisis',
                    'bible-state.json',
                ),
                byteSize: 40,
                merkleRootHex: 'a'.repeat(64),
                hasBibleState: true,
            },
        ]
        menuModel.lastStagedFountainPath = path.join(
            sandbox,
            'drafts',
            'active_scene.fountain',
        )
        ;(globalThis as any).LAST_STAGED_FOUNTAIN_PATH =
            menuModel.lastStagedFountainPath

        const huntedActions: string[] = []
        const mockState = {
            hunt: vi.fn(async (actionType: string, bale?: any) => {
                huntedActions.push(actionType)
                if (
                    actionType ===
                        '[Database action] Check Integrity Database' &&
                    bale?.slv
                ) {
                    bale.slv({
                        databaseBit: {
                            dat: {
                                reports: [
                                    { tableName: 'entities_live', rowCount: 6 },
                                    { tableName: 'facts', rowCount: 4 },
                                ],
                            },
                        },
                    })
                }
                return {}
            }),
        } as any

        // Step 1: Non-destructive blast-radius scan
        const preInventory = await scanEngineBlastRadius(
            sandbox,
            mockState,
            menuModel,
        )
        expect(preInventory.isAlreadyVoidState).toBe(false)
        expect(preInventory.compiledUniverseDirs).toBe(1)
        expect(preInventory.compiledUniverseSlugs).toEqual([
            'gotham-trinity-crisis',
        ])
        expect(preInventory.fountainDraftFiles).toBe(2)
        expect(preInventory.dialogueAstFiles).toBe(1)
        expect(preInventory.conductorExportFiles).toBe(1)
        expect(preInventory.sqliteDbFiles).toBe(2)
        expect(preInventory.inMemoryTableRows).toBe(10)
        expect(menuModel.lastBlastRadiusInventory).toEqual(preInventory)

        // Step 2: Execute all 4 spool purges
        const purgedCompiled = await purgeCompiledUniversesSpool(
            sandbox,
            menuModel,
            mockState,
        )
        expect(purgedCompiled).toBe(1)
        expect(menuModel.discoveredUniverses).toEqual([])
        expect(fs.existsSync(path.join(sandbox, 'compiled'))).toBe(true)

        const purgedDrafts = await purgeFountainDraftsSpool(
            sandbox,
            menuModel,
            mockState,
        )
        expect(purgedDrafts.fountainDraftFiles).toBe(2)
        expect(purgedDrafts.dialogueAstFiles).toBe(1)
        expect(menuModel.lastStagedFountainPath).toBeUndefined()
        expect((globalThis as any).LAST_STAGED_FOUNTAIN_PATH).toBeUndefined()

        const purgedExport = await purgeConductorExportSpool(sandbox, mockState)
        expect(purgedExport).toBe(1)
        expect(fs.existsSync(path.join(sandbox, 'conductor_export'))).toBe(
            false,
        )

        const purgedSqlite = await purgeLocalSqliteSpool(sandbox, mockState)
        expect(purgedSqlite).toBe(2)
        expect(huntedActions).toContain('[Database action] Close Database')
        expect(huntedActions).toContain(
            '[Database action] Reset Local Database',
        )

        // Step 3: Verify protected directive directory survived completely untouched
        expect(
            fs.existsSync(
                path.join(
                    sandbox,
                    'data',
                    'directive',
                    'day-000',
                    '000.focus.cpn',
                ),
            ),
        ).toBe(true)

        // Step 4: Re-scan confirms disk Void State
        const postInventory = await scanEngineBlastRadius(sandbox)
        expect(postInventory.totalDiskArtifacts).toBe(0)
        expect(postInventory.isAlreadyVoidState).toBe(true)
    })
})
