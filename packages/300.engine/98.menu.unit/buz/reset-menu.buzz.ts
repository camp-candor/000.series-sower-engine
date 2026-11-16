/**
 * 98.menu.unit - Local Disk Spool Obliteration & Blast-Radius Inventory Buzzers
 * Executes non-destructive pre-flight scans and boundary-guarded disk spool purges
 * across compiled/, drafts/, conductor_export/, and data/sqlite/ at T_0 = $0.00.
 */

import fs from 'node:fs'
import path from 'node:path'
import * as Color from '../../val/console-color.js'
import * as Align from '../../val/align.js'
import type State from '../../99.core/state.js'
import type { MenuModel } from '../menu.model.js'
import type MenuBit from '../fce/menu.bit.js'
import type { EngineBlastRadiusInventory } from '../fce/tabula-rasa.interface.js'
import type {
    EngineTabulaRasaReceipt,
    EngineTabulaRasaRequest,
} from '../fce/tabula-rasa.interface.js'
import {
    TABULA_RASA_TOKEN_1,
    TABULA_RASA_TOKEN_2,
    TABULA_RASA_TOKEN_3,
} from '../fce/tabula-rasa.interface.js'
import { assertSafeEngineResetTarget } from './reset-guard.buzz.js'
import {
    ENGINE_GENESIS_HASH_64,
    ENGINE_RELATIONAL_TABLES,
    ENGINE_PURGEABLE_TARGETS,
    ENGINE_UNIT_RESET_REGISTRY,
} from '../../00.engine.unit/val/reset-manifest.val.js'
import { resolveEngineRoot } from './00.menu.buzz.js'

const UPDATE_GRID = '[Grid action] Update Grid'
const OPEN_CHOICE = '[Open action] Open Choice'
const RESET_ENGINE = '[Engine action] Reset Engine'

const UPDATE_CONSOLE = '[Console action] Update Console'
const CLOSE_DATABASE = '[Database action] Close Database'
const RESET_LOCAL_DATABASE = '[Database action] Reset Local Database'

async function emitResetSpoolTelemetry(
    ste: State | undefined,
    lines: readonly string[],
): Promise<void> {
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)

    for (const line of lines) {
        if (lib && typeof lib.hunt === 'function') {
            await lib
                .hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
                .catch(() => {})
        } else if (ste && typeof ste.hunt === 'function') {
            await ste
                .hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
                .catch(() => {})
        }
    }
}

function collectFilesRecursive(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) {
        return []
    }
    const results: string[] = []
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
        if (entry.name === '.gitkeep') {
            continue
        }
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
            results.push(...collectFilesRecursive(fullPath))
        } else if (entry.isFile()) {
            results.push(fullPath)
        }
    }
    return results
}

function isSqliteSpoolFilename(filename: string): boolean {
    return (
        filename.endsWith('.local.db') ||
        filename.endsWith('.local.db-wal') ||
        filename.endsWith('.local.db-shm')
    )
}

/**
 * Task 4.1: Non-destructive pre-flight scanner evaluating all runtime disk spools
 * and all 10 in-memory relational ledger tables prior to Tabula Rasa authorization.
 */
export async function scanEngineBlastRadius(
    baseDir?: string,
    ste?: State,
    cpy?: MenuModel,
): Promise<EngineBlastRadiusInventory> {
    const engineRoot = baseDir ? path.resolve(baseDir) : resolveEngineRoot()

    // 1. Scan compiled/ universes
    const compiledDir = path.join(engineRoot, 'compiled')
    const compiledUniverseSlugs: string[] = []
    if (fs.existsSync(compiledDir)) {
        const entries = fs.readdirSync(compiledDir, { withFileTypes: true })
        for (const entry of entries) {
            if (
                entry.isDirectory() &&
                !entry.name.startsWith('.') &&
                entry.name !== '.gitkeep'
            ) {
                compiledUniverseSlugs.push(entry.name)
            }
        }
    }
    compiledUniverseSlugs.sort((a, b) => a.localeCompare(b))

    // 2. Scan drafts/ (.fountain and dialogue_ast.json files)
    const draftsDir = path.join(engineRoot, 'drafts')
    const draftFiles = collectFilesRecursive(draftsDir)
    let fountainDraftFiles = 0
    let dialogueAstFiles = 0
    for (const file of draftFiles) {
        const lower = path.basename(file).toLowerCase()
        if (lower.endsWith('.fountain')) {
            fountainDraftFiles++
        } else if (lower.endsWith('.json')) {
            dialogueAstFiles++
        }
    }

    // 3. Scan conductor_export/ fallback spool
    const exportDir = path.join(engineRoot, 'conductor_export')
    const conductorExportFiles = collectFilesRecursive(exportDir).length

    // 4. Scan data/sqlite/ local database files
    const sqliteDir = path.join(engineRoot, 'data', 'sqlite')
    const sqliteFiles = collectFilesRecursive(sqliteDir).filter((f) =>
        isSqliteSpoolFilename(path.basename(f)),
    )
    const sqliteDbFiles = sqliteFiles.length

    // 5. Query 02.database.unit for live relational table row counts
    const tableRowBreakdown: Record<string, number> = {}
    let inMemoryTableRows = 0
    for (const tableName of ENGINE_RELATIONAL_TABLES) {
        tableRowBreakdown[tableName] = 0
    }

    if (ste && typeof ste.hunt === 'function') {
        try {
            let statusBit: any = null
            await ste.hunt('[Database action] Check Integrity Database', {
                idx: 'blast-radius-db-scan',
                slv: (res: any) => {
                    statusBit = res?.databaseBit || res
                },
            })
            const reports = statusBit?.dat?.reports
            if (Array.isArray(reports)) {
                for (const rep of reports) {
                    if (
                        rep &&
                        typeof rep.tableName === 'string' &&
                        typeof rep.rowCount === 'number'
                    ) {
                        tableRowBreakdown[rep.tableName] = rep.rowCount
                        inMemoryTableRows += rep.rowCount
                    }
                }
            }
        } catch {
            // Non-blocking fallback when database unit is unmounted
        }
    }

    const totalDiskArtifacts =
        compiledUniverseSlugs.length +
        fountainDraftFiles +
        dialogueAstFiles +
        conductorExportFiles +
        sqliteDbFiles

    const isAlreadyVoidState =
        totalDiskArtifacts === 0 && inMemoryTableRows === 0

    const inventory: EngineBlastRadiusInventory = {
        engineRoot,
        compiledUniverseDirs: compiledUniverseSlugs.length,
        compiledUniverseSlugs,
        fountainDraftFiles,
        dialogueAstFiles,
        conductorExportFiles,
        sqliteDbFiles,
        inMemoryTableRows,
        tableRowBreakdown,
        totalDiskArtifacts,
        isAlreadyVoidState,
    }

    if (cpy) {
        cpy.lastBlastRadiusInventory = inventory
    }

    const previewLines = [
        '>> ============================================================',
        '>> [RESET:BLAST_RADIUS] PRE-FLIGHT VOID-STATE INVENTORY',
        `>> Target Root       : ${engineRoot}`,
        `>> Compiled Universes: ${inventory.compiledUniverseDirs} (${compiledUniverseSlugs.join(', ') || 'NONE'})`,
        `>> Fountain Drafts   : ${inventory.fountainDraftFiles} .fountain | ${inventory.dialogueAstFiles} AST .json`,
        `>> Conductor Export  : ${inventory.conductorExportFiles} file(s)`,
        `>> Local SQLite DBs  : ${inventory.sqliteDbFiles} file(s)`,
        `>> Relational Rows   : ${inventory.inMemoryTableRows} row(s) across ${ENGINE_RELATIONAL_TABLES.length} tables`,
        `>> Void State Status : ${isAlreadyVoidState ? 'ALREADY VOID STATE' : 'DIRTY (ARTIFACTS PRESENT)'}`,
        '>> ============================================================',
    ]
    await emitResetSpoolTelemetry(ste, previewLines)

    return inventory
}

/**
 * Task 4.2: Purges all ingested universe directories inside compiled/ while
 * preserving the root compiled/ container and clearing MenuModel.discoveredUniverses.
 */
export async function purgeCompiledUniversesSpool(
    engineRoot: string,
    cpy?: MenuModel,
    ste?: State,
): Promise<number> {
    const compiledDir = path.join(engineRoot, 'compiled')
    const safeCompiledDir = assertSafeEngineResetTarget(engineRoot, compiledDir)

    let purgedCount = 0
    if (fs.existsSync(safeCompiledDir)) {
        const entries = fs.readdirSync(safeCompiledDir, { withFileTypes: true })
        for (const entry of entries) {
            if (entry.name === '.gitkeep') {
                continue
            }
            const childPath = path.join(safeCompiledDir, entry.name)
            const safeChild = assertSafeEngineResetTarget(engineRoot, childPath)
            fs.rmSync(safeChild, { recursive: true, force: true })
            purgedCount++
        }
    } else {
        fs.mkdirSync(safeCompiledDir, { recursive: true })
    }

    if (cpy) {
        cpy.discoveredUniverses = []
    }

    await emitResetSpoolTelemetry(ste, [
        `>> [RESET:COMPILED] Purged ${purgedCount} compiled universe snapshot(s) [OK]`,
    ])

    return purgedCount
}

/**
 * Task 4.3: Purges all staged .fountain screenplays, dialogue_ast.json contracts,
 * and drafts/auto-script/* subdirectories inside drafts/, and scrubs global draft state.
 */
export async function purgeFountainDraftsSpool(
    engineRoot: string,
    cpy?: MenuModel,
    ste?: State,
): Promise<{ fountainDraftFiles: number; dialogueAstFiles: number }> {
    const draftsDir = path.join(engineRoot, 'drafts')
    const safeDraftsDir = assertSafeEngineResetTarget(engineRoot, draftsDir)

    let fountainDraftFiles = 0
    let dialogueAstFiles = 0

    if (fs.existsSync(safeDraftsDir)) {
        const allFiles = collectFilesRecursive(safeDraftsDir)
        for (const file of allFiles) {
            const lower = path.basename(file).toLowerCase()
            if (lower.endsWith('.fountain')) {
                fountainDraftFiles++
            } else if (lower.endsWith('.json')) {
                dialogueAstFiles++
            }
        }

        const entries = fs.readdirSync(safeDraftsDir, { withFileTypes: true })
        for (const entry of entries) {
            if (entry.name === '.gitkeep') {
                continue
            }
            const childPath = path.join(safeDraftsDir, entry.name)
            const safeChild = assertSafeEngineResetTarget(engineRoot, childPath)
            fs.rmSync(safeChild, { recursive: true, force: true })
        }
    } else {
        fs.mkdirSync(safeDraftsDir, { recursive: true })
    }

    if (cpy) {
        cpy.lastStagedFountainPath = undefined
    }
    if (typeof globalThis !== 'undefined') {
        delete (globalThis as any).LAST_STAGED_FOUNTAIN_PATH
    }

    await emitResetSpoolTelemetry(ste, [
        `>> [RESET:DRAFTS] Purged ${fountainDraftFiles} .fountain scripts, ${dialogueAstFiles} dialogue_ast.json files [OK]`,
    ])

    return {
        fountainDraftFiles,
        dialogueAstFiles,
    }
}

/**
 * Task 4.4: Purges fallback exported .fountain and dialogue_ast.json artifacts
 * inside conductor_export/.
 */
export async function purgeConductorExportSpool(
    engineRoot: string,
    ste?: State,
): Promise<number> {
    const exportDir = path.join(engineRoot, 'conductor_export')
    const safeExportDir = assertSafeEngineResetTarget(engineRoot, exportDir)

    let purgedCount = 0
    if (fs.existsSync(safeExportDir)) {
        purgedCount = collectFilesRecursive(safeExportDir).length
        fs.rmSync(safeExportDir, { recursive: true, force: true })
    }

    await emitResetSpoolTelemetry(ste, [
        `>> [RESET:EXPORT_SPOOL] Purged conductor_export spool (${purgedCount} files) [OK]`,
    ])

    return purgedCount
}

/**
 * Task 4.5: Closes active database realm handles via 02.database.unit and unlinks
 * all persisted .local.db, .local.db-wal, and .local.db-shm files in data/sqlite/.
 */
export async function purgeLocalSqliteSpool(
    engineRoot: string,
    ste?: State,
): Promise<number> {
    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(CLOSE_DATABASE, {}).catch(() => {})
        await ste.hunt(RESET_LOCAL_DATABASE, {}).catch(() => {})
    }

    const sqliteTarget = ENGINE_PURGEABLE_TARGETS.find(
        (t) => t.id === 'local_sqlite_databases',
    )
    const relSqliteDir = sqliteTarget
        ? sqliteTarget.relativePath
        : 'data/sqlite'
    const sqliteDir = path.join(engineRoot, relSqliteDir)
    const safeSqliteDir = assertSafeEngineResetTarget(engineRoot, sqliteDir)

    let unlinkedCount = 0
    if (fs.existsSync(safeSqliteDir)) {
        const candidateFiles = collectFilesRecursive(safeSqliteDir).filter(
            (f) => isSqliteSpoolFilename(path.basename(f)),
        )
        for (const filePath of candidateFiles) {
            const safeFile = assertSafeEngineResetTarget(engineRoot, filePath)
            fs.unlinkSync(safeFile)
            unlinkedCount++
        }
    }

    await emitResetSpoolTelemetry(ste, [
        `>> [RESET:SQLITE] Unlinked ${unlinkedCount} local SQLite database file(s) [OK]`,
    ])

    return unlinkedCount
}

export const TRIPLE_LOCK_STAGE_1_CHOICES: readonly string[] = Object.freeze([
    '[NO] CANCEL & KEEP ENGINE UNTOUCHED',
    '[CONFIRM 1/3] INITIATE ENGINE TABULA RASA RESET',
])

export const TRIPLE_LOCK_STAGE_2_CHOICES: readonly string[] = Object.freeze([
    '[NO] ABORT RESET IMMEDIATELY',
    '[NO] RETAIN DRAFTS & LEDGER TABLES',
    '[CONFIRM 2/3] ACKNOWLEDGE PERMANENT OBLITERATION OF ALL DRAFTS & LEDGERS',
])

export const TRIPLE_LOCK_STAGE_3_CHOICES: readonly string[] = Object.freeze([
    '[NO] STAND DOWN & DISARM ENGINE RESET',
    '[CONFIRM 3/3] EXECUTE GRAND BEGINNING (RETURN TO BYTE-0 VOID STATE)',
])

export function verifyHeadlessTripleLockTokens(req?: EngineTabulaRasaRequest): {
    valid: boolean
    failedStage: 0 | 1 | 2 | 3
    reason?: string
} {
    if (!req || req.confirmToken1 !== TABULA_RASA_TOKEN_1) {
        return {
            valid: false,
            failedStage: 1,
            reason: 'Missing or invalid confirmToken1 (expected CONFIRM_1_OF_3)',
        }
    }
    if (req.confirmToken2 !== TABULA_RASA_TOKEN_2) {
        return {
            valid: false,
            failedStage: 2,
            reason: 'Missing or invalid confirmToken2 (expected CONFIRM_2_OF_3)',
        }
    }
    if (req.confirmToken3 !== TABULA_RASA_TOKEN_3) {
        return {
            valid: false,
            failedStage: 3,
            reason: 'Missing or invalid confirmToken3 (expected CONFIRM_3_OF_3)',
        }
    }
    return { valid: true, failedStage: 0 }
}

async function promptTripleLockChoice(
    lib: any,
    choices: readonly string[],
): Promise<{ selected: string; val: number }> {
    const gridBit: any = await lib.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan: 8,
    })

    const choiceBit: any = await lib.hunt(OPEN_CHOICE, {
        dat: { clr0: Color.BLACK, clr1: Color.RED },
        src: Align.VERTICAL,
        lst: [...choices],
        net: gridBit?.grdBit?.dat,
    })

    const selected =
        typeof choiceBit?.chcBit?.src === 'string' ? choiceBit.chcBit.src : ''
    const val =
        typeof choiceBit?.chcBit?.val === 'number' ? choiceBit.chcBit.val : -1

    return { selected, val }
}

/**
 * Executes the verified in-memory unit reset fan-out and all four boundary-guarded
 * local disk spool purges, returning an EngineTabulaRasaReceipt.
 */
export async function executeEngineTabulaRasaPurge(
    baseDir?: string,
    cpy?: MenuModel,
    ste?: State,
): Promise<EngineTabulaRasaReceipt> {
    const engineRoot = baseDir ? path.resolve(baseDir) : resolveEngineRoot()
    const preInventory = await scanEngineBlastRadius(engineRoot, ste, cpy)
    const receipts: string[] = [
        ...preInventory.compiledUniverseSlugs.map(
            (s) => `>> [RESET:TARGET_UNIVERSE] ${s}`,
        ),
    ]

    // 1. Reset core engine boot posture and fan out RESET_<UNIT> across stateful BEE units
    let unitsResetList: string[] = ENGINE_UNIT_RESET_REGISTRY.filter(
        (u) => u.classification === 'STATEFUL_RESETTABLE',
    ).map((u) => u.resetActionType || u.unitFolder)

    if (ste && typeof ste.hunt === 'function') {
        let engBit: any = null
        await ste
            .hunt(RESET_ENGINE, {
                idx: 'tabula-rasa-core-reset',
                dat: { cascadeMode: true },
                slv: (res: any) => {
                    engBit = res?.engBit || res
                },
            })
            .catch(() => {})
        if (Array.isArray(engBit?.dat?.unitsResetList)) {
            unitsResetList = engBit.dat.unitsResetList
        }
    }

    // 2. Purge all 4 runtime disk spools behind assertSafeEngineResetTarget
    const compiledUniverseDirs = await purgeCompiledUniversesSpool(
        engineRoot,
        cpy,
        ste,
    )
    const draftStats = await purgeFountainDraftsSpool(engineRoot, cpy, ste)
    const conductorExportFiles = await purgeConductorExportSpool(
        engineRoot,
        ste,
    )
    const sqliteDbFiles = await purgeLocalSqliteSpool(engineRoot, ste)

    // 3. Re-scan post-purge Void State
    const postInventory = await scanEngineBlastRadius(engineRoot, ste, cpy)
    const voidStateVerified = postInventory.isAlreadyVoidState

    const completionLines = [
        '>> ============================================================',
        `>> [TABULA_RASA:COMPLETE] 000.series-sower-engine -> VOID STATE (${voidStateVerified ? 'PASS' : 'WARN'})`,
        `>> Purged Universes  : ${compiledUniverseDirs}`,
        `>> Purged Drafts     : ${draftStats.fountainDraftFiles} .fountain | ${draftStats.dialogueAstFiles} AST .json`,
        `>> Purged Exports    : ${conductorExportFiles}`,
        `>> Unlinked SQLite   : ${sqliteDbFiles}`,
        `>> Root Merkle Hash  : ${ENGINE_GENESIS_HASH_64}`,
        '>> ============================================================',
    ]
    await emitResetSpoolTelemetry(ste, completionLines)
    receipts.push(...completionLines)

    const receipt: EngineTabulaRasaReceipt = {
        ok: true,
        voidStateVerified,
        purgedCounts: {
            compiledUniverseDirs,
            fountainDraftFiles: draftStats.fountainDraftFiles,
            dialogueAstFiles: draftStats.dialogueAstFiles,
            conductorExportFiles,
            sqliteDbFiles,
            inMemoryTableRows: preInventory.inMemoryTableRows,
        },
        tablesClearedCount: ENGINE_RELATIONAL_TABLES.length,
        unitsResetList,
        stateSnapshotHash: ENGINE_GENESIS_HASH_64,
        timestampIso: new Date().toISOString(),
        receipts,
    }

    if (cpy) {
        cpy.lastTabulaRasaReceipt = receipt
        cpy.activeSeriesSlug = ''
        cpy.activeSelection = '[99] RESET ENGINE & LEDGER TO VOID STATE'
    }

    return receipt
}

/**
 * Phase 5 Orchestrator: Drives the Three-Stage Fail-Closed Terminal Confirmation Gate
 * (or Three-Token Headless Gate when global.LIBRARY is absent).
 */
export async function runEngineTabulaRasaMenu(
    cpy: MenuModel,
    bal?: MenuBit,
    ste?: State,
): Promise<MenuModel> {
    const req: EngineTabulaRasaRequest =
        (bal?.dat as any)?.tabulaRasaRequest ||
        (bal?.dat as EngineTabulaRasaRequest) ||
        {}
    const baseDir = req.baseDir || (bal?.dat as any)?.baseDir
    const engineRoot = baseDir ? path.resolve(baseDir) : resolveEngineRoot()

    const preInventory = await scanEngineBlastRadius(engineRoot, ste, cpy)
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)

    const buildAbortedReceipt = (
        stage: 1 | 2 | 3,
        reason: string,
    ): EngineTabulaRasaReceipt => ({
        ok: false,
        voidStateVerified: preInventory.isAlreadyVoidState,
        purgedCounts: {
            compiledUniverseDirs: 0,
            fountainDraftFiles: 0,
            dialogueAstFiles: 0,
            conductorExportFiles: 0,
            sqliteDbFiles: 0,
            inMemoryTableRows: 0,
        },
        tablesClearedCount: 0,
        unitsResetList: [],
        stateSnapshotHash: ENGINE_GENESIS_HASH_64,
        timestampIso: new Date().toISOString(),
        receipts: [
            `>> [RESET:ABORTED] Triple-lock gate cancelled at Stage ${stage}/3. System untouched.`,
        ],
        abortedAtStage: stage,
        error: reason,
    })

    // Headless / Programmatic Agent Path (global.LIBRARY absent)
    if (!lib || typeof lib.hunt !== 'function') {
        const tokenAudit = verifyHeadlessTripleLockTokens(req)
        if (!tokenAudit.valid) {
            const abortLine = `>> [RESET:ABORTED] Triple-lock gate cancelled at Stage ${tokenAudit.failedStage}/3. System untouched.`
            await emitResetSpoolTelemetry(ste, [abortLine])
            const abortedReceipt = buildAbortedReceipt(
                (tokenAudit.failedStage || 1) as 1 | 2 | 3,
                tokenAudit.reason || 'TRIPLE_LOCK_TOKEN_REJECTED',
            )
            cpy.lastTabulaRasaReceipt = abortedReceipt
            if (bal?.slv) {
                bal.slv({
                    mnuBit: {
                        idx: 'reset-void-state-aborted',
                        val: 0,
                        src: 'ABORTED',
                        dat: abortedReceipt,
                        lst: abortedReceipt.receipts,
                    },
                })
            }
            return cpy
        }

        const receipt = await executeEngineTabulaRasaPurge(engineRoot, cpy, ste)
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'engine-tabula-rasa-pass',
                    val: 1,
                    src: 'VOID_STATE',
                    dat: receipt,
                    lst: receipt.receipts,
                },
            })
        }
        return cpy
    }

    // Interactive Blessed TUI Path: Stage 1 of 3
    const stage1 = await promptTripleLockChoice(
        lib,
        TRIPLE_LOCK_STAGE_1_CHOICES,
    )
    if (
        stage1.val === -1 ||
        stage1.selected !== TRIPLE_LOCK_STAGE_1_CHOICES[1]
    ) {
        const abortLine =
            '>> [RESET:ABORTED] Triple-lock gate cancelled at Stage 1/3. System untouched.'
        await emitResetSpoolTelemetry(ste, [abortLine])
        const aborted = buildAbortedReceipt(1, 'Stage 1/3 declined by operator')
        cpy.lastTabulaRasaReceipt = aborted
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'reset-void-state-aborted',
                    val: 0,
                    src: 'ABORTED',
                    dat: aborted,
                    lst: aborted.receipts,
                },
            })
        }
        return cpy
    }

    await emitResetSpoolTelemetry(ste, [
        '>> [RESET:LOCK_1_CLEARED] Stage 1/3 verified. Awaiting Stage 2/3 confirmation...',
    ])

    // Interactive Blessed TUI Path: Stage 2 of 3 (Shifted Index 2 Anti-Double-Tap Guard)
    const stage2 = await promptTripleLockChoice(
        lib,
        TRIPLE_LOCK_STAGE_2_CHOICES,
    )
    if (
        stage2.val === -1 ||
        stage2.selected !== TRIPLE_LOCK_STAGE_2_CHOICES[2]
    ) {
        const abortLine =
            '>> [RESET:ABORTED] Triple-lock gate cancelled at Stage 2/3. System untouched.'
        await emitResetSpoolTelemetry(ste, [abortLine])
        const aborted = buildAbortedReceipt(2, 'Stage 2/3 declined by operator')
        cpy.lastTabulaRasaReceipt = aborted
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'reset-void-state-aborted',
                    val: 0,
                    src: 'ABORTED',
                    dat: aborted,
                    lst: aborted.receipts,
                },
            })
        }
        return cpy
    }

    await emitResetSpoolTelemetry(ste, [
        '>> [RESET:LOCK_2_CLEARED] Stage 2/3 verified. ARMED FOR FINAL EXECUTION (Stage 3/3)...',
    ])

    // Interactive Blessed TUI Path: Stage 3 of 3
    const stage3 = await promptTripleLockChoice(
        lib,
        TRIPLE_LOCK_STAGE_3_CHOICES,
    )
    if (
        stage3.val === -1 ||
        stage3.selected !== TRIPLE_LOCK_STAGE_3_CHOICES[1]
    ) {
        const abortLine =
            '>> [RESET:ABORTED] Triple-lock gate cancelled at Stage 3/3. System untouched.'
        await emitResetSpoolTelemetry(ste, [abortLine])
        const aborted = buildAbortedReceipt(3, 'Stage 3/3 declined by operator')
        cpy.lastTabulaRasaReceipt = aborted
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'reset-void-state-aborted',
                    val: 0,
                    src: 'ABORTED',
                    dat: aborted,
                    lst: aborted.receipts,
                },
            })
        }
        return cpy
    }

    const receipt = await executeEngineTabulaRasaPurge(engineRoot, cpy, ste)
    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: 'engine-tabula-rasa-pass',
                val: 1,
                src: 'VOID_STATE',
                dat: receipt,
                lst: receipt.receipts,
            },
        })
    }
    return cpy
}
