import { describe, it, expect, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EngineModel } from '../../00.engine.unit/engine.model.js'
import {
    bootEngine,
    resetEngine,
} from '../../00.engine.unit/buz/engine.buzz.js'
import {
    evaluateResetCoveragePure,
    auditDiskWritePathsCoverage,
} from '../../00.engine.unit/buz/reset-coverage.buzz.js'
import { ENGINE_GENESIS_HASH_64 } from '../../00.engine.unit/val/reset-manifest.val.js'
import { DatabaseModel } from '../../02.database.unit/database.model.js'
import {
    ensureSchemaDatabase,
    insertFact,
    resetLocalDatabase,
    closeDatabaseAction,
} from '../../02.database.unit/buz/database.buzz.js'
import { PrimordialModel } from '../../13.primordial.unit/primordial.model.js'
import { resetPrimordialAction } from '../../13.primordial.unit/buz/primordial.buzz.js'
import { StateModel } from '../../16.state.unit/state.model.js'
import { resetStateAction } from '../../16.state.unit/buz/state.buzz.js'
import { TickModel } from '../../17.tick.unit/tick.model.js'
import { resetTickAction } from '../../17.tick.unit/buz/tick.buzz.js'
import { MenuModel } from '../menu.model.js'
import {
    runEngineTabulaRasaMenu,
    scanEngineBlastRadius,
} from '../buz/reset-menu.buzz.js'
import {
    stageSpatialHeaderWithFountainEditor,
    compileFullFountainDraftToAst,
    exportFountainAndAstToConductor,
} from '../buz/fountain-workflow-menu.buzz.js'
import {
    TABULA_RASA_TOKEN_1,
    TABULA_RASA_TOKEN_2,
    TABULA_RASA_TOKEN_3,
} from '../fce/tabula-rasa.interface.js'

describe('Phase 7: Reset Coverage Sentinel & Void-State Round-Trip Idempotency', () => {
    const tempDirs: string[] = []

    afterEach(() => {
        delete (globalThis as any).ACTIVE_SERIES_SLUG
        delete (globalThis as any).LAST_STAGED_FOUNTAIN_PATH
        while (tempDirs.length > 0) {
            const dir = tempDirs.pop()!
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

    it('Task 7.1 & 7.2: certifies 100% BEE unit reset coverage and traps unmanifested disk writes', () => {
        const cleanReport = evaluateResetCoveragePure([
            {
                filePath: '98.menu.unit/buz/reset-menu.buzz.ts',
                content: "fs.writeFileSync('drafts/active_scene.fountain', '')",
            },
        ])
        expect(cleanReport.valid).toBe(true)
        expect(cleanReport.unhookedUnits).toEqual([])
        expect(cleanReport.missingCompanionActions).toEqual([])

        const breachReport = auditDiskWritePathsCoverage([
            {
                filePath: '98.menu.unit/buz/rogue-writer.buzz.ts',
                content: "fs.writeFileSync('broadcast_logs/rogue.json', '{}')",
            },
        ])
        expect(breachReport.valid).toBe(false)
        expect(breachReport.violations[0]).toContain('[BREACH]')
    })

    it('Task 7.4: executes full Gotham lifecycle mutation and restores exact State_Void_0 parity', async () => {
        const sandbox = fs.mkdtempSync(
            path.join(os.tmpdir(), 'sower-roundtrip-'),
        )
        tempDirs.push(sandbox)

        // 1. Capture initial Void State snapshot (State_Void_0)
        const engineModel = new EngineModel()
        const dbModel = new DatabaseModel()
        const primordialModel = new PrimordialModel()
        const stateModel = new StateModel()
        const tickModel = new TickModel()
        const menuModel = new MenuModel()

        const stateVoid0 = await scanEngineBlastRadius(sandbox)
        expect(stateVoid0.isAlreadyVoidState).toBe(true)
        expect(stateVoid0.totalDiskArtifacts).toBe(0)

        // Wire in-process State dispatcher routing actions across unit models
        const simState: any = {
            hunt: vi.fn(async (actionType: string, bale?: any) => {
                switch (actionType) {
                    case '[Database action] Ensure Schema Database':
                        await ensureSchemaDatabase(dbModel, bale, simState)
                        return {}
                    case '[Database action] Insert Fact':
                        await insertFact(dbModel, bale, simState)
                        return {}
                    case '[Database action] Close Database':
                        await closeDatabaseAction(dbModel, bale, simState)
                        return {}
                    case '[Database action] Reset Local Database':
                        await resetLocalDatabase(dbModel, bale, simState)
                        return {}
                    case '[Database action] Check Integrity Database': {
                        const reports = Object.entries(dbModel.tables).map(
                            ([tableName, map]) => ({
                                tableName,
                                rowCount: map.size,
                                status: 'OK',
                            }),
                        )
                        if (bale?.slv) {
                            bale.slv({ databaseBit: { dat: { reports } } })
                        }
                        return {}
                    }
                    case '[Primordial action] Reset Primordial':
                        await resetPrimordialAction(
                            primordialModel,
                            bale,
                            simState,
                        )
                        return {}
                    case '[State action] Reset State':
                        await resetStateAction(stateModel, bale, simState)
                        return {}
                    case '[Tick action] Reset Tick':
                        await resetTickAction(tickModel, bale, simState)
                        return {}
                    case '[Engine action] Reset Engine':
                        await resetEngine(engineModel, bale, simState)
                        return {}
                    default:
                        if (bale?.slv) {
                            bale.slv({})
                        }
                        return {}
                }
            }),
        }

        // 2. Execute full lifecycle mutation pass (Boot -> Seed -> Tick -> [18] -> [20] -> [21])
        await bootEngine(
            engineModel,
            {
                idx: 'boot-gotham',
                dat: {
                    seriesSlug: 'gotham-trinity-crisis',
                    bibleState: { seriesSlug: 'gotham-trinity-crisis' },
                },
            } as any,
            simState,
        )
        expect(engineModel.status).toBe('READY')

        await insertFact(
            dbModel,
            {
                idx: 'fact-1',
                dat: {
                    fact: {
                        id: 'fact_lasso_bound',
                        claim_text:
                            'Wonder Woman bound Joker wrist on GCPD roof',
                        scope: 'EVENT',
                        version: 1,
                        author: 'sim',
                        created_at_ms: 1000,
                        last_edited_at_ms: 1000,
                    } as any,
                },
            },
            simState,
        )
        expect(dbModel.tables.facts.size).toBe(1)

        primordialModel.genesisSeeded = true
        primordialModel.hRoot = 'c'.repeat(64)
        ;(tickModel as any).currentTick = 24

        // Stage Fountain draft [18], compile AST [20], and export to conductor [21]
        await stageSpatialHeaderWithFountainEditor(
            menuModel,
            { dat: { baseDir: sandbox, seriesSlug: 'gotham-trinity-crisis' } },
            simState,
        )
        await compileFullFountainDraftToAst(
            menuModel,
            { dat: { baseDir: sandbox, seriesSlug: 'gotham-trinity-crisis' } },
            simState,
        )
        await exportFountainAndAstToConductor(
            menuModel,
            {
                dat: {
                    baseDir: sandbox,
                    seriesSlug: 'gotham-trinity-crisis',
                    conductorRoot: path.join(sandbox, 'conductor_export'),
                },
            },
            simState,
        )

        const dirtyInventory = await scanEngineBlastRadius(sandbox, simState)
        expect(dirtyInventory.isAlreadyVoidState).toBe(false)
        expect(dirtyInventory.totalDiskArtifacts).toBeGreaterThan(0)
        expect(dirtyInventory.inMemoryTableRows).toBe(1)

        // 3. Negative Control: Invalid/missing tokens must fail closed with zero deletions
        let abortRes: any = null
        await runEngineTabulaRasaMenu(
            menuModel,
            {
                idx: 'negative-control-abort',
                dat: {
                    tabulaRasaRequest: {
                        baseDir: sandbox,
                        confirmToken1: TABULA_RASA_TOKEN_1,
                    },
                },
                slv: (res: any) => {
                    abortRes = res?.mnuBit
                },
            },
            simState,
        )
        expect(abortRes?.val).toBe(0)
        expect(dbModel.tables.facts.size).toBe(1)

        // 4. Positive Control: All 3 valid tokens restore exact State_Void_0 parity
        let resetRes: any = null
        await runEngineTabulaRasaMenu(
            menuModel,
            {
                idx: 'positive-control-reset',
                dat: {
                    tabulaRasaRequest: {
                        baseDir: sandbox,
                        confirmToken1: TABULA_RASA_TOKEN_1,
                        confirmToken2: TABULA_RASA_TOKEN_2,
                        confirmToken3: TABULA_RASA_TOKEN_3,
                    },
                },
                slv: (res: any) => {
                    resetRes = res?.mnuBit
                },
            },
            simState,
        )

        expect(resetRes?.idx).toBe('engine-tabula-rasa-pass')
        expect(resetRes?.val).toBe(1)
        expect(resetRes?.dat?.voidStateVerified).toBe(true)

        // Assert exact structural equivalence with State_Void_0
        expect(engineModel.status).toBe('OFFLINE')
        expect(engineModel.booted).toBe(false)
        expect(engineModel.lastStateHash).toBe(ENGINE_GENESIS_HASH_64)
        expect(primordialModel.genesisSeeded).toBe(false)
        expect(primordialModel.hRoot).toBe(ENGINE_GENESIS_HASH_64)
        expect((tickModel as any).currentTick).toBe(0)
        for (const tableMap of Object.values(dbModel.tables)) {
            expect(tableMap.size).toBe(0)
        }

        const postResetInventory = await scanEngineBlastRadius(
            sandbox,
            simState,
        )
        expect(postResetInventory.isAlreadyVoidState).toBe(true)
        expect(postResetInventory.totalDiskArtifacts).toBe(0)
        expect(postResetInventory.inMemoryTableRows).toBe(0)
    })
})
