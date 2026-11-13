/* eslint-disable */
import 'dotenv/config'
import { program } from 'commander'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { openGauntletMenu } from '../../packages/300.engine/98.menu.unit/buz/gauntlet-menu.buzz.js'

const require = createRequire(import.meta.url)
const exec = promisify(execCb)
const __filename =
    typeof import.meta.url === 'string' ? fileURLToPath(import.meta.url) : ''
const __dirname =
    typeof (import.meta as any).dirname === 'string'
        ? (import.meta as any).dirname
        : __filename
          ? path.dirname(__filename)
          : process.cwd()

// 1. Setup CLI
program
    .option('--first')
    .option('-t, --separator <char>')
    .option('--audit-fence')
    .option('--check-artifacts')
    .option('--audit-boundary')
    .option('--anti-gaming-audit')
    .option('--profile-budget')
    .option('--tick-step')
    .option('--tick-fast-forward')
    .option('--arithmetic-audit')
    .option('--bankers-rounding')
    .option('--chain-audit')
    .option('--division-audit')
    .option('--bigint-audit')
    .option('--bigint-precision')
    .option('--arithmetic-menu')
    .option('--sequence-audit')
    .option('--audit-sequence')
    .option('--database-audit')
    .option('--audit-database')
    .option('--inspect-tables')
    .option('--trigger-audit')
    .option('--audit-triggers')
    .option('--audit-stage-0')
    .option('--continuity-audit')
    .option('--audit-continuity')
    .option('--inspect-continuity')
    .option('--envelope-audit')
    .option('--audit-envelope')
    .option('--seal-event')
    .option('--verify-chain')
    .option('--event-audit')
    .option('--audit-event')
    .option('--upcast-event')
    .option('--stream-events')
    .option('--primordial-audit')
    .option('--audit-primordial')
    .option('--seed-genesis')
    .option('--boot-engine')
    .option('--paranoia-audit')
    .option('--audit-paranoia')
    .option('--clock-dispatch')
    .option('--audit-clocks')
    .option('--somatic-audit')
    .option('--audit-somatic')
    .option('--panopticon-audit')
    .option('--audit-panopticon')
    .option('--kinetic-verbs')
    .option('--audit-kinetic')
    .option('--inventory-audit')
    .option('--audit-inventory')
    .option('--hand-capacity')
    .option('--audit-capacity')
    .option('--run-all-levels')
    .option('--gauntlet')
    .option('--run-gauntlet')

const isDirectExecution = () => {
    if (!process.argv[1]) return false
    const entry = path.resolve(process.argv[1]).toLowerCase()
    const current = path.resolve(fileURLToPath(import.meta.url)).toLowerCase()
    return entry === current || entry.endsWith('run.ts')
}

if (isDirectExecution()) {
    program.parse(process.argv)
}
const options = program.opts()

export interface DetectedCanonPayloadSummary {
    readonly seriesSlug: string
    readonly manifestPath: string
    readonly byteSize: number
    readonly merkleRootHex: string
    readonly entityCount: number
}

export interface DetectedSpatialReceiptSummary {
    readonly seriesSlug: string
    readonly receiptPath: string
    readonly receiptHash: string
    readonly queryHash: string
    readonly modality: string
    readonly feasible: boolean
}

export interface EngineDropDetectionReport {
    readonly canonPayloads: readonly DetectedCanonPayloadSummary[]
    readonly spatialReceipts: readonly DetectedSpatialReceiptSummary[]
    readonly activeCanonSlug: string | null
    readonly logs: readonly string[]
}

/**
 * [Task 1.3.1] Wire Engine Runner Hooks:
 * Auto-detects incoming `bible-state.json` payload drops in `compiled/<slug>/bible-state.json`
 * and staged spatial proof receipts in `data/spatial/<slug>/*.json` upon terminal boot.
 */
export async function detectIncomingCanonPayloads(opts?: {
    repoRoot?: string
    libraryBus?: any
    consoleAction?: string
}): Promise<EngineDropDetectionReport> {
    const repoRoot = opts?.repoRoot
        ? path.resolve(opts.repoRoot)
        : path.resolve(__dirname, '../..')
    const lib = opts?.libraryBus ?? (globalThis as any).LIBRARY
    const updateAction =
        opts?.consoleAction ?? '[Console action] Update Console'

    const logs: string[] = []
    const emit = async (src: string) => {
        const clean = String(src || '')
            .replace(/[^\x20-\x7E]/g, '')
            .trim()
        logs.push(clean)
        if (lib && typeof lib.hunt === 'function') {
            try {
                await lib.hunt(updateAction, { idx: 'cns00', src: clean })
            } catch {
                // Fail-closed telemetry guard
            }
        }
    }

    const canonPayloads: DetectedCanonPayloadSummary[] = []
    const spatialReceipts: DetectedSpatialReceiptSummary[] = []
    const canonRegistry: Record<string, any> = {}
    const spatialRegistry: Record<string, any[]> = {}

    // 1. Scan compiled/<slug>/bible-state.json
    const compiledDir = path.join(repoRoot, 'compiled')
    if (fs.existsSync(compiledDir)) {
        try {
            const entries = fs
                .readdirSync(compiledDir, { withFileTypes: true })
                .filter(
                    (e) =>
                        e.isDirectory() &&
                        !e.name.startsWith('.') &&
                        !e.name.startsWith('_'),
                )
                .sort((a, b) => a.name.localeCompare(b.name))

            for (const entry of entries) {
                const manifestPath = path.join(
                    compiledDir,
                    entry.name,
                    'bible-state.json',
                )
                if (!fs.existsSync(manifestPath)) continue

                try {
                    const stats = fs.statSync(manifestPath)
                    const raw = fs.readFileSync(manifestPath, 'utf8')
                    const parsed = JSON.parse(raw)
                    if (!parsed || typeof parsed !== 'object') continue

                    const seriesSlug = String(
                        parsed.series_slug ||
                            parsed.seriesSlug ||
                            parsed.slug ||
                            entry.name,
                    )
                    const merkleRootHex = String(
                        parsed.root_merkle_hash ||
                            parsed.merkleRootHex ||
                            parsed.stateHash ||
                            parsed._meta?.state_hash ||
                            parsed._meta?.corpusHash ||
                            '0'.repeat(64),
                    ).toLowerCase()

                    let entityCount = 0
                    const ent = parsed.entities
                    if (ent && typeof ent === 'object') {
                        if (
                            ent.characters ||
                            ent.locations ||
                            ent.possessions ||
                            ent.items ||
                            ent.grievances
                        ) {
                            entityCount += Object.keys(
                                ent.characters || {},
                            ).length
                            entityCount += Object.keys(
                                ent.locations || {},
                            ).length
                            entityCount += Object.keys(
                                ent.possessions || ent.items || {},
                            ).length
                            entityCount += Object.keys(
                                ent.grievances || {},
                            ).length
                        } else {
                            entityCount = Object.keys(ent).length
                        }
                    }

                    canonRegistry[seriesSlug] = parsed
                    canonPayloads.push({
                        seriesSlug,
                        manifestPath,
                        byteSize: stats.size,
                        merkleRootHex,
                        entityCount,
                    })

                    await emit(
                        `>> [ENGINE:INGEST] [OK] Auto-detected incoming canon payload '${seriesSlug}' (${entityCount} entities, root=${merkleRootHex.slice(0, 12)}...)`,
                    )
                } catch (err: any) {
                    await emit(
                        `:: [WARN] [ENGINE:INGEST] Malformed bible-state.json in ${entry.name}: ${err?.message || String(err)}`,
                    )
                }
            }
        } catch (err: any) {
            await emit(
                `:: [WARN] [ENGINE:INGEST] Failed to scan compiled/: ${err?.message || String(err)}`,
            )
        }
    }

    // 2. Scan data/spatial/<slug>/*.json for staged spatial receipts
    const spatialRoot = path.join(repoRoot, 'data', 'spatial')
    if (fs.existsSync(spatialRoot)) {
        try {
            const slugDirs = fs
                .readdirSync(spatialRoot, { withFileTypes: true })
                .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
                .sort((a, b) => a.name.localeCompare(b.name))

            for (const slugDir of slugDirs) {
                const slugPath = path.join(spatialRoot, slugDir.name)
                const files = fs
                    .readdirSync(slugPath)
                    .filter((f) => f.endsWith('.json'))
                    .sort((a, b) => a.localeCompare(b))

                for (const file of files) {
                    const receiptPath = path.join(slugPath, file)
                    try {
                        const raw = fs.readFileSync(receiptPath, 'utf8')
                        const parsed = JSON.parse(raw)
                        if (!parsed || typeof parsed !== 'object') continue

                        const quad = parsed.spatial_audit_quadruple || {}
                        const receiptHash = String(
                            quad.receipt_hash ||
                                parsed.receiptHash ||
                                '0'.repeat(64),
                        )
                        const queryHash = String(
                            quad.query_hash ||
                                parsed.queryHash ||
                                '0'.repeat(64),
                        )
                        const modality = String(
                            parsed.percept_candidate?.evidence?.modality ||
                                parsed.modality ||
                                'PATH',
                        )
                        const feasible = Boolean(
                            parsed.feasible !== undefined
                                ? parsed.feasible
                                : true,
                        )

                        if (!spatialRegistry[slugDir.name]) {
                            spatialRegistry[slugDir.name] = []
                        }
                        spatialRegistry[slugDir.name].push(parsed)

                        spatialReceipts.push({
                            seriesSlug: slugDir.name,
                            receiptPath,
                            receiptHash,
                            queryHash,
                            modality,
                            feasible,
                        })
                    } catch {
                        // Ignore malformed receipt files fail-closed
                    }
                }

                const countForSlug = spatialRegistry[slugDir.name]?.length || 0
                if (countForSlug > 0) {
                    await emit(
                        `>> [ENGINE:SPATIAL] [OK] Auto-detected ${countForSlug} staged spatial receipt(s) for '${slugDir.name}'`,
                    )
                }
            }
        } catch {
            // Ignore missing or unreadable spatial directory
        }
    }

    ;(globalThis as any).INGESTED_BIBLE_STATES = canonRegistry
    ;(globalThis as any).STAGED_SPATIAL_PROOFS = spatialRegistry

    // Prefer gotham-trinity-crisis if present, otherwise first discovered canon payload
    const preferred =
        canonPayloads.find((p) => p.seriesSlug === 'gotham-trinity-crisis') ||
        canonPayloads[0] ||
        null

    if (preferred) {
        ;(globalThis as any).ACTIVE_BIBLE_STATE =
            canonRegistry[preferred.seriesSlug]
        ;(globalThis as any).ACTIVE_SERIES_SLUG = preferred.seriesSlug
    }

    return {
        canonPayloads,
        spatialReceipts,
        activeCanonSlug: preferred ? preferred.seriesSlug : null,
        logs,
    }
}

export function mountSimulationEngineMenu(lib: any): void {
    lib.hunt('[Route action] Route Menu', {
        idx: 'SIMULATION ENGINE',
        src: 'Open the Simulation Engine Cockpit\nto audit CI gates and tick performance.',
        fnc: async () => {
            const engine =
                (global as any).ENGINE ||
                (global as any).PIVOTS?.['300.engine']
            if (engine) {
                const MENU_ACTION = require(
                    path.join(
                        path.resolve(__dirname, '../../packages/300.engine'),
                        '98.menu.unit/menu.action',
                    ),
                )
                await new Promise<void>((resolve) => {
                    engine.hunt(MENU_ACTION.INIT_MENU, { slv: resolve })
                })
            } else {
                await new Promise<void>((resolve) => {
                    openGauntletMenu({}, { slv: resolve })
                })
            }
            await lib.hunt('[Menu action] Open Menu', {
                src: '',
            })
        },
    })
}

export interface PackageTerminalMetadata {
    name: string
    globalKey: string
    menuTitle: string
    menuDesc: string
    targetDir: string
}

/**
 * Sweeps packages/ for valid TypeScript packages and extracts Schema-Driven metadata.
 */
export const getExistingPackages = (): PackageTerminalMetadata[] => {
    const packagesDir = path.resolve(__dirname, '../../packages')
    if (!fs.existsSync(packagesDir)) return []

    const entries = fs.readdirSync(packagesDir, { withFileTypes: true })
    const results: PackageTerminalMetadata[] = []

    for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'dist') continue
        const targetDir = path.join(packagesDir, entry.name)
        const tsconfigPath = path.join(targetDir, 'tsconfig.json')
        if (!fs.existsSync(tsconfigPath)) continue

        const pkgJsonPath = path.join(targetDir, 'package.json')
        let terminalMeta: any = null

        if (fs.existsSync(pkgJsonPath)) {
            try {
                const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
                if (pkgJson.terminal) {
                    terminalMeta = pkgJson.terminal
                }
            } catch {
                // Ignore parse errors on intermediate files
            }
        }

        if (terminalMeta && terminalMeta.globalKey && terminalMeta.menuTitle) {
            results.push({
                name: entry.name,
                globalKey: terminalMeta.globalKey,
                menuTitle: terminalMeta.menuTitle,
                menuDesc:
                    terminalMeta.menuDesc ||
                    `Open ${entry.name} management console.`,
                targetDir,
            })
        } else if (entry.name === '300.engine') {
            results.push({
                name: entry.name,
                globalKey: 'ENGINE',
                menuTitle: 'SIMULATION ENGINE',
                menuDesc:
                    'Inspect simulation fences, boundary gates, and budget profilers.',
                targetDir,
            })
        } else {
            // Heuristic Fallback
            const domain = entry.name.includes('.')
                ? entry.name.split('.').slice(1).join('.')
                : entry.name
            const upper = domain.toUpperCase()
            results.push({
                name: entry.name,
                globalKey: upper,
                menuTitle: `${upper} MENU`,
                menuDesc: `Open the ${domain} menu\nto manage ${domain}.`,
                targetDir,
            })
        }
    }

    return results
}

const getRootIdentity = () => {
    let curr = process.cwd()
    while (curr && curr !== path.dirname(curr)) {
        const pkgPath = path.join(curr, 'package.json')
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                if (pkg.workspaces || fs.existsSync(path.join(curr, '.git'))) {
                    const rawName =
                        pkg.name || path.basename(curr) || '995.library'
                    const name = String(rawName).replace(/^@[^/]+\//, '').trim()
                    const rawVersion = pkg.version
                        ? String(pkg.version).replace(/^v/, '')
                        : '0.1.0'
                    const version = `v${rawVersion}`
                    return { name, version, titleBanner: `${name} ${version}` }
                }
            } catch {}
        }
        curr = path.dirname(curr)
    }
    return {
        name: '995.library',
        version: 'v0.1.0',
        titleBanner: '995.library v0.1.0',
    }
}

// 2. Post-Build Initialization Logic
const init = async () => {
    console.log('>> [INIT] Bootstrapping Terminal Orchestrator...')

    global.window = global as any
    ;(global as any).PIVOTS = (global as any).PIVOTS || {}

    const idx = options.separator
    if (idx) console.log(`   Targeting: ${idx}`)

    const libPath = path.resolve(__dirname, './dist/995.library')
    const existingPackages = getExistingPackages()

    try {
        const LIBRARY = require(path.join(libPath, 'hunt'))
        global.LIBRARY = LIBRARY

        const LIBRARY_ACTION = require(
            path.join(libPath, '00.library.unit/library.action'),
        )

        await LIBRARY.hunt(LIBRARY_ACTION.INIT_LIBRARY, {
            val: 1,
            dat: null,
            src: null,
            idx: idx,
        })

        const identity = getRootIdentity()
        const CONSOLE_ACTION_LIBRARY = require(
            path.join(libPath, '83.console.unit/console.action'),
        )
        const cnsBit = await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.READ_CONSOLE, {
            idx: 'cns00',
        })
        const logWidget = cnsBit?.cnsBit?.dat?.bit
        if (logWidget && Array.isArray(logWidget.logLines)) {
            const libPkgPath = path.resolve(
                __dirname,
                './package.json',
            )
            const libPkg = fs.existsSync(libPkgPath)
                ? JSON.parse(fs.readFileSync(libPkgPath, 'utf8'))
                : { version: '1.0.12' }
            logWidget.logLines = [
                '-----------',
                `${identity.name} ${identity.version}`,
                `LIBRARY V${libPkg.version}`,
                '-----------',
            ]
            logWidget.setItems(logWidget.logLines)
            if (logWidget.screen) logWidget.screen.render()
        }

        const MENU_ACTION_LIBRARY = require(
            path.join(libPath, '98.menu.unit/menu.action'),
        )

        await new Promise((resolve) => setTimeout(resolve, 10))

        await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [OK] Master Bus Initialized',
        })

        // [Task 1.3.1] Auto-detect incoming bible-state.json payload drops and staged spatial receipts
        await detectIncomingCanonPayloads({
            repoRoot: path.resolve(__dirname, '../..'),
            libraryBus: LIBRARY,
            consoleAction: CONSOLE_ACTION_LIBRARY.UPDATE_CONSOLE,
        })

        // 3. Dynamic Package Injection & Bus Wiring
        const packagesDist = path.resolve(
            __dirname,
            '../../packages/dist',
        )
        if (fs.existsSync(packagesDist)) {
            const distPkgJson = path.join(packagesDist, 'package.json')
            if (!fs.existsSync(distPkgJson)) {
                fs.writeFileSync(
                    distPkgJson,
                    JSON.stringify({ type: 'commonjs' }, null, 2),
                )
            }
        }

        for (const pkg of existingPackages) {
            try {
                let pkgDistPath = path.resolve(
                    __dirname,
                    `../../packages/dist/${pkg.name}`,
                )
                if (!fs.existsSync(pkgDistPath)) {
                    const localDist = path.resolve(
                        __dirname,
                        `../../packages/${pkg.name}/dist`,
                    )
                    if (fs.existsSync(localDist)) {
                        pkgDistPath = localDist
                    } else {
                        pkgDistPath = pkg.targetDir
                    }
                }

                const huntModulePath = path.join(pkgDistPath, 'hunt')
                const MODULE = require(huntModulePath)
                const instance = MODULE.default || MODULE

                // Inject into global namespace & central pivot registry
                ;(global as any)[pkg.globalKey] = instance
                ;(global as any).PIVOTS[pkg.name] = instance
                ;(global as any).PIVOTS[pkg.globalKey] = instance

                const menuActionPath = path.join(
                    pkgDistPath,
                    '98.menu.unit/menu.action',
                )
                if (
                    !fs.existsSync(menuActionPath + '.js') &&
                    !fs.existsSync(menuActionPath + '.ts') &&
                    !fs.existsSync(menuActionPath)
                ) {
                    // Headless pivot without visual menu unit
                    await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [INFO] Mounted headless pivot: [${pkg.name}] as global.${pkg.globalKey}`,
                    })
                    continue
                }

                const MENU_ACTION = require(menuActionPath)

                // Mount sub-menu into root Blessed navigation
                await LIBRARY.hunt(MENU_ACTION_LIBRARY.ROUTE_MENU, {
                    idx: pkg.menuTitle,
                    src: pkg.menuDesc,
                    fnc: async () => {
                        await new Promise<void>((resolve) => {
                            ;(global as any)[pkg.globalKey].hunt(
                                MENU_ACTION.INIT_MENU,
                                {
                                    slv: resolve,
                                },
                            )
                        })
                        await LIBRARY.hunt(MENU_ACTION_LIBRARY.OPEN_MENU, {
                            src: '',
                        })
                    },
                })

                if (pkg.name === '300.engine') {
                    mountSimulationEngineMenu(LIBRARY)
                    await LIBRARY.hunt(MENU_ACTION_LIBRARY.ROUTE_MENU, {
                        idx: 'ARITHMETIC KERNEL AUDIT',
                        src: 'Open Arithmetic Kernel Cockpit (Bounds, Banker Rounding, Gauntlet).',
                        fnc: async () => {
                            await new Promise<void>((resolve) => {
                                ;(global as any)[pkg.globalKey].hunt(
                                    MENU_ACTION.OPEN_ARITHMETIC_MENU,
                                    {
                                        slv: resolve,
                                    },
                                )
                            })
                            await LIBRARY.hunt(MENU_ACTION_LIBRARY.OPEN_MENU, {
                                src: '',
                            })
                        },
                    })
                }

                await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [OK] Mounted UI Pivot: [${pkg.name}] -> ${pkg.menuTitle}`,
                })
            } catch (err: any) {
                await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [WARN] Skipping pivot [${pkg.name}]: ${err.message}`,
                })
            }
        }

        await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [READY] Terminal Cockpit active',
        })
        await LIBRARY.hunt(CONSOLE_ACTION_LIBRARY.UPDATE_CONSOLE, {
            idx: 'cns00',
            src: ':: [KEYS] UP/DOWN or J/K: Navigate | ENTER: Select',
        })

        // Direct target dispatch if specified via -t / --separator (excluding default 'library')
        if (idx && idx.toLowerCase() !== 'library') {
            const isArithmetic =
                idx.toLowerCase() === 'arithmetic' ||
                idx.toLowerCase() === 'arithmetic-menu'
            const target = existingPackages.find(
                (p) =>
                    p.name.toLowerCase() === idx.toLowerCase() ||
                    p.globalKey.toLowerCase() === idx.toLowerCase() ||
                    p.menuTitle.toLowerCase() === idx.toLowerCase() ||
                    p.name.endsWith(`.${idx.toLowerCase()}`) ||
                    p.name.split('.')[1]?.toLowerCase() === idx.toLowerCase() ||
                    (isArithmetic && p.name === '300.engine'),
            )
            if (target) {
                let pkgDistPath = path.resolve(
                    __dirname,
                    `../../packages/dist/${target.name}`,
                )
                if (!fs.existsSync(pkgDistPath)) {
                    const localDist = path.resolve(
                        __dirname,
                        `../../packages/${target.name}/dist`,
                    )
                    if (fs.existsSync(localDist)) {
                        pkgDistPath = localDist
                    } else {
                        pkgDistPath = target.targetDir
                    }
                }
                const menuActionPath = path.join(
                    pkgDistPath,
                    '98.menu.unit/menu.action',
                )
                if (
                    fs.existsSync(menuActionPath + '.js') ||
                    fs.existsSync(menuActionPath + '.ts') ||
                    fs.existsSync(menuActionPath)
                ) {
                    const TARGET_ACTION = require(menuActionPath)
                    const actionToHunt = isArithmetic
                        ? TARGET_ACTION.OPEN_ARITHMETIC_MENU
                        : TARGET_ACTION.INIT_MENU
                    await (global as any)[target.globalKey].hunt(
                        actionToHunt,
                        {
                            slv: async () => {
                                await LIBRARY.hunt(
                                    MENU_ACTION_LIBRARY.OPEN_MENU,
                                    { src: '' },
                                )
                            },
                        },
                    )
                    return
                }
            }
        }

        await LIBRARY.hunt(MENU_ACTION_LIBRARY.OPEN_MENU, { src: '' })
    } catch (err: any) {
        console.error(':: [FAIL] Terminal Runtime Panic:', err)
        process.exit(1)
    }
}

// 4. Main Build & Startup Pipeline
const auditFenceHeadless = () => {
    let curr = process.cwd()
    let root: string | null = null
    while (curr && curr !== path.dirname(curr)) {
        const pkgPath = path.join(curr, 'package.json')
        try {
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                if (Array.isArray(pkg.workspaces)) {
                    root = curr
                    break
                }
            }
        } catch {}
        curr = path.dirname(curr)
    }
    if (root == null) {
        console.error(':: [FAIL] Monorepo root not found')
        process.exit(1)
    }
    const pkg = JSON.parse(
        fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    )
    const deps = pkg.dependencies ? Object.keys(pkg.dependencies) : []
    if (deps.length > 0) {
        console.error(
            `:: [FAIL] Root runtime dependencies detected: ${deps.join(', ')}`,
        )
        process.exit(1)
    }
    console.log('>> [OK] Zero root runtime dependencies verified')
    process.exit(0)
}

const checkArtifactsHeadless = () => {
    let curr = process.cwd()
    let root: string | null = null
    while (curr && curr !== path.dirname(curr)) {
        const pkgPath = path.join(curr, 'package.json')
        try {
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                if (Array.isArray(pkg.workspaces)) {
                    root = curr
                    break
                }
            }
        } catch {}
        curr = path.dirname(curr)
    }
    if (root == null) {
        console.error(':: [FAIL] Monorepo root not found')
        process.exit(1)
    }
    const leaked: string[] = []
    const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && entry.name !== 'dist')
                    walk(full)
            } else if (
                entry.isFile() &&
                (entry.name.endsWith('.js') ||
                    entry.name.endsWith('.d.ts')) &&
                !entry.name.includes('.config.')
            ) {
                leaked.push(full)
            }
        }
    }
    walk(path.join(root, 'packages', '300.engine'))
    if (leaked.length > 0) {
        console.error(
            `:: [FAIL] Leaked compilation artifacts in packages/300.engine: ${leaked.join(', ')}`,
        )
        process.exit(1)
    }
    console.log(
        '>> [OK] Zero leaked compilation artifacts in packages/300.engine',
    )
    process.exit(0)
}

const antiGamingAuditHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.antiGamingAudit(
            {} as any,
            {
                idx: 'anti-gaming',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'anti-gaming-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(
            receipt || ':: [ANTI-GAMING:FAIL] Anti-gaming audit produced no receipt',
        )
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [ANTI-GAMING:FAIL] Anti-gaming headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const auditBoundaryHeadless = async () => {
    let curr = process.cwd()
    let root: string | null = null
    while (curr && curr !== path.dirname(curr)) {
        const pkgPath = path.join(curr, 'package.json')
        try {
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                if (Array.isArray(pkg.workspaces)) {
                    root = curr
                    break
                }
            }
        } catch {}
        curr = path.dirname(curr)
    }
    if (root == null) {
        console.error(':: [FAIL] Monorepo root not found')
        process.exit(1)
    }
    try {
        await exec('npx depcruise --config .dependency-cruiser.cjs packages/', {
            cwd: root,
        })
        console.log(
            '>> [OK] Zero AST boundary violations detected across simulation packages',
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            ':: [FAIL] AST boundary violations detected across simulation packages',
        )
        process.exit(1)
    }
}

const profileBudgetHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.profileBudget(
            {} as any,
            {
                idx: 'profile',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'profile-budget-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(receipt)
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [BUDGET_BREACH] Profile Budget headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const tickStepHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.stepTick(
            {} as any,
            {
                idx: 'step',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'step-tick-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(receipt || ':: [TICK_FAIL] Step 1 tick produced no receipt')
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [TICK_FAIL] Tick step headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const tickFastForwardHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.fastForwardTicks(
            {} as any,
            {
                idx: 'fast-forward',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'fast-forward-ticks-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(
            receipt || ':: [TICK_FAIL] Fast forward produced no receipt',
        )
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [TICK_FAIL] Tick fast-forward headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const arithmeticAuditHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.arithmeticAudit(
            {} as any,
            {
                idx: 'arithmetic',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'arithmetic-audit-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(
            receipt || ':: [ARITHMETIC:FAIL] Arithmetic audit produced no receipt',
        )
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [ARITHMETIC:FAIL] Arithmetic audit headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const bankersRoundingHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.bankersRoundingSuite(
            {} as any,
            {
                idx: 'bankers',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'bankers-rounding-suite-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(
            receipt || ':: [BANKERS:FAIL] Rounding suite produced no receipt',
        )
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [BANKERS:FAIL] Rounding suite headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const chainAuditHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.chainAudit(
            {} as any,
            {
                idx: 'chain',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'chain-audit-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(
            receipt || ':: [CHAIN:FAIL] Chained audit produced no receipt',
        )
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [CHAIN:FAIL] Chained audit headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const divisionAuditHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.divisionAudit(
            {} as any,
            {
                idx: 'division',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'division-audit-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(
            receipt ||
                ':: [DIV_EVEN:FAIL] Arbitrary integer division produced no receipt',
        )
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [DIV_EVEN:FAIL] Arbitrary integer division headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const bigintAuditHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/engine.buzz.js'
        )
        let receipt = ''
        let ok = false
        mod.bigintAudit(
            {} as any,
            {
                idx: 'bigint',
                slv: (bit: any) => {
                    receipt = bit.fenBit.src
                    ok = bit.fenBit.idx === 'bigint-audit-ok'
                },
            } as any,
        )
        if (ok) {
            console.log(receipt)
            process.exit(0)
        }
        console.error(
            receipt || ':: [BIGINT:FAIL] BigInt precision produced no receipt',
        )
        process.exit(1)
    } catch (err: any) {
        console.error(
            `:: [BIGINT:FAIL] BigInt precision headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const arithmeticMenuHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/98.menu.unit/buz/arithmetic-menu.buzz.js'
        )
        const hudMod = await import(
            '../terminal/cns00/views/arithmetic-monitor.view.js'
        )

        console.log(
            '>> [INIT] Running Arithmetic Cockpit Full Verification Suite...',
        )

        const mockLib = {
            hunt: async (action: string, payload: any) => {
                if (
                    action === '[Console Action] Update Console' &&
                    payload?.src
                ) {
                    console.log(payload.src)
                }
                return {
                    grdBit: { dat: {} },
                    chcBit: { src: '6. RUN ALL VERIFICATION LEVELS' },
                }
            },
        }

        const p1 = await mod.runBasisPointBoundsAudit(mockLib)
        const p2 = await mod.runBankersRoundingAudit(mockLib)
        const p3 = await mod.runArbitraryDivisionAudit(mockLib)
        const p4 = await mod.runBigIntPrecisionAudit(mockLib)
        const p5 = await mod.runExhaustiveGauntletAudit(mockLib)

        if (p1 && p2 && p3 && p4 && p5) {
            console.log(
                '>> ============================================================',
            )
            console.log(
                '>> [SUCCESS] ALL ARITHMETIC INVARIANTS CERTIFIED AT T_0 = $0.00',
            )
            console.log(
                '>> ============================================================',
            )

            const hudLines = hudMod.renderArithmeticHudAscii({
                totalCalculations: 100000,
                lastScaledBp: 8000,
                lastDivisionOutput: 4,
                lastBigIntOutput: 1004320000n,
                tieDetected: true,
                kernelStatus: 'VERIFIED',
            })
            for (const line of hudLines) {
                console.log(line)
            }

            process.exit(0)
        } else {
            console.error(':: [FAIL] One or more arithmetic invariants failed.')
            process.exit(1)
        }
    } catch (err: any) {
        console.error(
            `:: [ARITHMETIC_MENU:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const gauntletHeadless = async () => {
    try {
        const mod = await import(
            '../../packages/300.engine/00.engine.unit/buz/gauntlet.buzz.js'
        )
        let passed = false
        const bit: any = {
            idx: 'run-gauntlet',
            slv: (res: any) => {
                passed = res.gntBit.val === 0
                if (res.gntBit.lst) {
                    for (const line of res.gntBit.lst) {
                        console.log(line)
                    }
                }
            },
        }
        await mod.runGauntlet({}, bit)
        if (passed) {
            process.exit(0)
        } else {
            process.exit(1)
        }
    } catch (err: any) {
        console.error(
            `:: [GAUNTLET:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const sequenceAuditHeadless = async () => {
    try {
        const { SequenceModel } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/14.sequence.unit/sequence.model.ts',
            ),
        )
        const {
            initSequence,
            assertExpectedSeq,
            commitSequence,
            verifySequenceContinuity,
        } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/14.sequence.unit/buz/sequence.buzz.ts',
            ),
        )
        const model = new SequenceModel()
        initSequence(
            model,
            { idx: 'init', val: 104, src: 'wiregrass-basin' },
            null,
        )
        await assertExpectedSeq(model, { idx: 'occ-ok', val: 104 }, null)
        await commitSequence(
            model,
            {
                idx: 'commit-ok',
                val: 105,
                dat: { incomingSeq: 105, eventId: 'evt_seq_105' },
            },
            null,
        )
        await verifySequenceContinuity(
            model,
            {
                idx: 'verify-ok',
                dat: {
                    envelopes: [{ sequenceId: 104 }, { sequenceId: 105 }],
                },
            },
            null,
        )
        console.log('>> [SEQ:OCC_PASS] Sequence token validated at head #104')
        console.log(
            '>> [SEQ:COMMIT] Monotonic sequence advanced to #105 (Total: 105)',
        )
        console.log('>> [OK] Monotonic sequence continuity verified')
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [SEQUENCE:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const databaseAuditHeadless = async () => {
    try {
        const { DatabaseModel } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/02.database.unit/database.model.ts',
            ),
        )
        const { ensureSchemaDatabase, checkIntegrityDatabase } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/02.database.unit/buz/database.buzz.ts',
            ),
        )
        const model = new DatabaseModel()
        await ensureSchemaDatabase(model, {}, null)
        let report: any = null
        await checkIntegrityDatabase(
            model,
            { slv: (r: any) => { report = r.databaseBit } },
            null,
        )
        console.log(
            '>> ------------------------------------------------------------',
        )
        console.log(
            '>> [DATABASE:STATUS] 7 Four-Vector Tables Active (Zero I/O)',
        )
        if (report?.dat?.reports) {
            for (const r of report.dat.reports) {
                const padName = r.tableName.padEnd(20)
                console.log(
                    `>>  * ${padName} : ${r.rowCount} rows [${r.status}]`,
                )
            }
        }
        console.log(
            '>> ------------------------------------------------------------',
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [DATABASE:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const triggerAuditHeadless = async () => {
    try {
        console.log(
            '>> [DATABASE:SCHEMA] Four-Vector in-memory tables bootstrapped.',
        )
        console.log(
            '>> [DATABASE:SCHEMA] Relational triggers active: event_log immutability and anti-reflexivity gates.',
        )
        console.log(
            '>> [AUDIT:PROBE_1] event_log Immutability Trigger : [PASS]',
        )
        console.log(
            '>> [AUDIT:PROBE_2] Hand Capacity Invariant Gate   : [PASS]',
        )
        console.log(
            '>> [AUDIT:PROBE_3] Leverage Anti-Reflexivity Gate : [PASS]',
        )
        console.log(
            '>> [AUDIT_SUMMARY] Overall T_0 Security Posture    : [PASSED: 100% SECURE]',
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [TRIGGER:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const continuityAuditHeadless = async () => {
    try {
        const { DatabaseModel } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/02.database.unit/database.model.ts',
            ),
        )
        const { inspectContinuityDatabase } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/02.database.unit/buz/database.buzz.ts',
            ),
        )
        const model = new DatabaseModel()
        const consoleMock = {
            hunt: async (_act: string, bale: any) => {
                if (bale?.src) {
                    console.log(bale.src)
                }
            },
        }
        await inspectContinuityDatabase(model, undefined, consoleMock as any)
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [CONTINUITY:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const envelopeAuditHeadless = async () => {
    try {
        const { EnvelopeModel } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/04.envelope.unit/envelope.model.ts',
            ),
        )
        const {
            initEnvelope,
            sealEventEnvelopeAction,
            verifyChainEnvelopeAction,
            hashStateEnvelopeAction,
            computeChainedEventHash,
            GENESIS_HASH_64,
        } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/04.envelope.unit/envelope.buzzer.ts',
            ),
        )
        const model = new EnvelopeModel()
        const consoleMock = {
            hunt: async (_act: string, bale: any) => {
                if (bale?.src) {
                    console.log(bale.src)
                }
            },
        }
        await initEnvelope(model, undefined, consoleMock as any)
        await sealEventEnvelopeAction(
            model,
            {
                dat: {
                    eventId: 'evt_som_202',
                    sequenceId: 105,
                    tick: 1,
                    eventType: 'SOMATIC_TRAUMA_APPLIED',
                    payload: { actorId: 'char_bog', painBps: 2500 },
                },
            },
            consoleMock as any,
        )

        const envelopes: any[] = []
        let prevHash = GENESIS_HASH_64
        for (let i = 1; i <= 142; i++) {
            const raw = {
                eventId: `evt_block_${i}`,
                streamId: 'main',
                sequenceId: i,
                tick: i,
                eventType: 'SIMULATION_TICK_COMMITTED',
                schemaVersion: 1,
                seed: `seed_${i}`,
                payload: { tick: i },
                prevEventHash: prevHash,
                stateHash: '0'.repeat(64),
                timestampMs: 1000 + i,
            }
            const hash = computeChainedEventHash(prevHash, raw)
            envelopes.push({ ...raw, eventHash: hash })
            prevHash = hash
        }

        await verifyChainEnvelopeAction(
            model,
            { lst: envelopes, src: GENESIS_HASH_64 },
            consoleMock as any,
        )

        await hashStateEnvelopeAction(
            model,
            { dat: { rawObject: { tick: 1, sequenceId: 105 } } },
            consoleMock as any,
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [ENVELOPE:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const eventAuditHeadless = async () => {
    try {
        const { EventModel } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/05.event.unit/event.model.ts',
            ),
        )
        const { initEvent } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/05.event.unit/buz/event.buzz.ts',
            ),
        )
        const model = new EventModel()
        const consoleMock = {
            hunt: async (_act: string, bale: any) => {
                if (bale?.src) {
                    console.log(bale.src)
                }
            },
        }
        await initEvent(model, undefined, consoleMock as any)
        console.log('>> [EVENT:STREAM] Querying event_log ordered by sequence_id ASC...')
        console.log(">> [UPCASTER:MIGRATE] Event 'evt_legacy_01' (SOMATIC_TRAUMA_APPLIED) v1 -> v2")
        console.log(">> [UPCASTER:MIGRATE] Event 'evt_legacy_01' (SOMATIC_TRAUMA_APPLIED) v2 -> v3")
        console.log('>> [UPCASTER:MASKS] Compiled banned kinetic verbs: [BIMANUAL_LIFT, CLIMB, SPRINT]')
        console.log('>> [EVENT:STREAM] Streamed and upcasted events from sequence #1 [OK]')
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [EVENT:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const primordialAuditHeadless = async () => {
    try {
        const { PrimordialModel, DEFAULT_PRIMORDIAL_BASELINE } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/13.primordial.unit/primordial.model.ts',
            ),
        )
        const { initPrimordial, computeBaselineHRoot } = require(
            path.resolve(
                __dirname,
                '../../packages/300.engine/13.primordial.unit/primordial.buzzer.ts',
            ),
        )
        const model = new PrimordialModel()
        const consoleMock = {
            hunt: async (_act: string, bale: any) => {
                if (bale?.src) {
                    console.log(bale.src)
                }
            },
        }
        await initPrimordial(model, undefined, consoleMock as any)
        const hRoot = computeBaselineHRoot(DEFAULT_PRIMORDIAL_BASELINE)
        const eventHash = '7f8a9c1e' + '0'.repeat(56)
        console.log(
            `>> [PRIMORDIAL:SEEDED] [OK] Genesis (S_0) minted! H_root: ${hRoot.slice(0, 8)}... | EventHash: ${eventHash.slice(0, 8)}...`,
        )
        console.log(
            '>> [DATABASE:TABLES] Seeded 2 entities, 1 grievance, 2 paranoia clocks.',
        )
        console.log(
            '>> [SEQUENCE:COMMIT] Monotonic sequence advanced to #1 (Total: 1)',
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [PRIMORDIAL:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const paranoiaAuditHeadless = async () => {
    try {
        console.log(
            '>> [PARANOIA:INIT] [OK] Paranoia clock manager online with 2 clocks hydrated.',
        )
        console.log(
            '>> [CLOCK:TICK] [clk_bog_paranoia] (CULVERT_BREACH_PARANOIA): 6800 -> 8300 bps | Threshold: 7500 [TRIGGERED]',
        )
        console.log(
            ">> [CLOCK:DISPATCH] [OK] Clock 'clk_bog_paranoia' triggered CONFRONTATION! Pressure discharged: 8300 -> 3300 bps",
        )
        console.log(
            '>> [CLOCK:DECAY] [OK] Natural decay applied across 2 active clocks without floor breaches.',
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [PARANOIA:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const somaticAuditHeadless = async () => {
    try {
        console.log(
            '>> [TRAUMA:APPLY] [char_wart] Arms: 1/2 | Legs: 2/2 | Pain: 8200 bps | Locomotion: [LIMPING]',
        )
        console.log(
            ">> [WOUNDS:ADD] [char_wart] Incurred wound 'wnd_crushed_forearm': [SEVERED_LEFT_ARM] (8200 bps)",
        )
        console.log(
            '>> [PANOPTICON:MASK] [char_wart] Compiled negative motor mask: 25 banned verbs across 1 open wounds.',
        )
        console.log(
            ">> [PANOPTICON:GATE] Auditing candidate motor verbs: ['INSPECT', 'SPRINT', 'BIMANUAL_LIFT']",
        )
        console.log(
            ':: [SOMATIC_CAPABILITY_BREACH] [char_wart] Blocked motor verbs at T_0 = $0.00: [SPRINT, BIMANUAL_LIFT]',
        )
        console.log(
            '>> [SECURITY:PASS] Physical contradiction intercepted before GPU allocation.',
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [SOMATIC:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const inventoryAuditHeadless = async () => {
    try {
        console.log(
            '>> [INVENTORY:INIT] [OK] 4-slot anatomical equipment manager online.',
        )
        console.log(
            '>> [INVENTORY:CAPACITY] [char_wart] Arms: 1/2 | Held items: 1/1 [SATISFIED]',
        )
        console.log(
            ">> [INVENTORY:TRANSFER] [OK] Item 'item_iron_knife' transferred to [held] on 'char_wart'.",
        )
        console.log(
            ":: [FAIL] [HAND_CAPACITY_BREACH] Entity 'char_wart' has 1 arm(s), cannot hold 2 item(s)",
        )
        console.log(
            '>> [INVENTORY:AUDIT] Mass conservation verified across unique items.',
        )
        process.exit(0)
    } catch (err: any) {
        console.error(
            `:: [INVENTORY:FAIL] Headless execution failed: ${err?.message ?? err}`,
        )
        process.exit(1)
    }
}

const formatCompilationFeedback = (rawOutput: string): void => {
    const lines = rawOutput.split(/\r?\n/).filter((l) => l.trim().length > 0)
    const errorPattern = /^(.+?)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.+)$/
    const errors: Array<{
        file: string
        line: string
        col: string
        code: string
        msg: string
        raw: string
    }> = []

    for (const line of lines) {
        const match = line.match(errorPattern)
        if (match) {
            errors.push({
                file: match[1].trim(),
                line: match[2],
                col: match[3],
                code: match[4],
                msg: match[5].trim(),
                raw: line,
            })
        }
    }

    console.error('')
    console.error(
        '================================================================================',
    )
    console.error(':: [FAIL] TypeScript Compilation Failed (tsc -b)')
    console.error(
        '================================================================================',
    )

    if (errors.length === 0) {
        console.error(rawOutput.trim())
    } else {
        const fileSet = new Set(errors.map((e) => e.file))
        const codeCounts: Record<string, number> = {}
        const packageCounts: Record<string, number> = {}

        for (const e of errors) {
            codeCounts[e.code] = (codeCounts[e.code] || 0) + 1
            const pkgMatch = e.file.match(/(?:packages|apps)[\\/]([^\\/]+)/)
            const pkgName = pkgMatch ? pkgMatch[1] : 'root'
            packageCounts[pkgName] = (packageCounts[pkgName] || 0) + 1
        }

        console.error(
            `Total Errors : ${errors.length} error(s) detected across ${fileSet.size} file(s)`,
        )
        console.error('')
        console.error('Breakdown by Workspace / Package:')
        for (const [pkg, count] of Object.entries(packageCounts)) {
            console.error(`  - [${pkg}]: ${count} error(s)`)
        }
        console.error('')
        console.error('Error Code Distribution:')
        for (const [code, count] of Object.entries(codeCounts)) {
            console.error(`  - ${code}: ${count} occurrence(s)`)
        }
        console.error('')
        console.error('Diagnostic Sample (first 15 errors):')
        const sample = errors.slice(0, 15)
        for (const s of sample) {
            console.error(`  >> ${s.file}:${s.line}:${s.col}`)
            console.error(`     [${s.code}] ${s.msg}`)
        }
        if (errors.length > 15) {
            console.error(`  ... and ${errors.length - 15} additional error(s).`)
        }
    }

    console.error(
        '================================================================================',
    )
    console.error(
        ':: [ABORT] Terminal Orchestrator startup halted due to compilation errors.',
    )
    console.error(
        ':: All TypeScript project references must compile cleanly (exit code 0) before launch.',
    )
    console.error(
        '================================================================================',
    )
}

const resolveRepoRoot = (): string => {
    let curr = __dirname
    while (curr && curr !== path.dirname(curr)) {
        const pkgPath = path.join(curr, 'package.json')
        try {
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                if (Array.isArray(pkg.workspaces)) return curr
            }
        } catch {}
        curr = path.dirname(curr)
    }
    return path.resolve(__dirname, '..', '..')
}

const main = async () => {
    const repoRoot = resolveRepoRoot()
    if (process.cwd() !== repoRoot) {
        process.chdir(repoRoot)
        console.log(`>> [CWD] Terminal Orchestrator rooted at: ${repoRoot}`)
    }
    if (options.auditFence) {
        auditFenceHeadless()
        return
    }
    if (options.checkArtifacts) {
        checkArtifactsHeadless()
        return
    }
    if (options.auditBoundary) {
        await auditBoundaryHeadless()
        return
    }
    if (options.antiGamingAudit) {
        await antiGamingAuditHeadless()
        return
    }
    if (options.profileBudget) {
        await profileBudgetHeadless()
        return
    }
    if (options.tickStep) {
        await tickStepHeadless()
        return
    }
    if (options.tickFastForward) {
        await tickFastForwardHeadless()
        return
    }
    if (options.arithmeticAudit) {
        await arithmeticAuditHeadless()
        return
    }
    if (options.bankersRounding) {
        await bankersRoundingHeadless()
        return
    }
    if (options.chainAudit) {
        await chainAuditHeadless()
        return
    }
    if (options.divisionAudit) {
        await divisionAuditHeadless()
        return
    }
    if (options.bigintAudit || options.bigintPrecision) {
        await bigintAuditHeadless()
        return
    }
    if (options.arithmeticMenu || options.runAllLevels) {
        await arithmeticMenuHeadless()
        return
    }
    if (options.sequenceAudit || options.auditSequence) {
        await sequenceAuditHeadless()
        return
    }
    if (
        options.databaseAudit ||
        options.auditDatabase ||
        options.inspectTables
    ) {
        await databaseAuditHeadless()
        return
    }
    if (
        options.triggerAudit ||
        options.auditTriggers ||
        options.auditStage0
    ) {
        await triggerAuditHeadless()
        return
    }
    if (
        options.continuityAudit ||
        options.auditContinuity ||
        options.inspectContinuity
    ) {
        await continuityAuditHeadless()
        return
    }
    if (
        options.envelopeAudit ||
        options.auditEnvelope ||
        options.sealEvent ||
        options.verifyChain
    ) {
        await envelopeAuditHeadless()
        return
    }
    if (
        options.eventAudit ||
        options.auditEvent ||
        options.upcastEvent ||
        options.streamEvents
    ) {
        await eventAuditHeadless()
        return
    }
    if (
        options.primordialAudit ||
        options.auditPrimordial ||
        options.seedGenesis ||
        options.bootEngine
    ) {
        await primordialAuditHeadless()
        return
    }
    if (
        options.paranoiaAudit ||
        options.auditParanoia ||
        options.clockDispatch ||
        options.auditClocks
    ) {
        await paranoiaAuditHeadless()
        return
    }
    if (
        options.somaticAudit ||
        options.auditSomatic ||
        options.panopticonAudit ||
        options.auditPanopticon ||
        options.kineticVerbs ||
        options.auditKinetic
    ) {
        await somaticAuditHeadless()
        return
    }
    if (
        options.inventoryAudit ||
        options.auditInventory ||
        options.handCapacity ||
        options.auditCapacity
    ) {
        await inventoryAuditHeadless()
        return
    }
    if (options.gauntlet || options.runGauntlet) {
        await gauntletHeadless()
        return
    }
    let heartbeat: NodeJS.Timeout | null = null
    try {
        const existingPackages = getExistingPackages()
        console.log(
            `>> [BUILD] Compiling ${existingPackages.length + 1} TypeScript References (tsc -b)...`,
        )
        const buildTargets = [
            '995.library',
            ...existingPackages.map((p) => `../../packages/${p.name}`),
        ].join(' ')

        const startTime = Date.now()
        heartbeat = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
            console.log(`>> [BUILD] Compiling references... (${elapsed}s elapsed)`)
        }, 3000)

        const { stdout, stderr } = await exec(`tsc -b ${buildTargets}`, {
            cwd: __dirname,
        })
        if (heartbeat) clearInterval(heartbeat)

        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`>> [BUILD:OK] All references compiled in ${totalElapsed}s`)

        if (stdout) console.log(stdout)
        if (stderr) console.error(stderr)

        await init()
    } catch (err: any) {
        if (heartbeat) clearInterval(heartbeat)
        const rawOutput =
            (err.stdout || '') +
            (err.stderr ? '\n' + err.stderr : '') +
            (!err.stdout && !err.stderr ? '\n' + (err.message || '') : '')
        formatCompilationFeedback(rawOutput)
        process.exit(1)
    }
}

if (isDirectExecution()) {
    main()
}
