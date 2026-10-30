/* eslint-disable */
import 'dotenv/config'
import { program } from 'commander'
import { exec as execCb } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

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
    .option('--profile-budget')
    .option('--tick-step')
    .option('--tick-fast-forward')
program.parse(process.argv)
const options = program.opts()

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
            const target = existingPackages.find(
                (p) =>
                    p.name.toLowerCase() === idx.toLowerCase() ||
                    p.globalKey.toLowerCase() === idx.toLowerCase() ||
                    p.menuTitle.toLowerCase() === idx.toLowerCase() ||
                    p.name.endsWith(`.${idx.toLowerCase()}`) ||
                    p.name.split('.')[1]?.toLowerCase() === idx.toLowerCase(),
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
                    await (global as any)[target.globalKey].hunt(
                        TARGET_ACTION.INIT_MENU,
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

const main = async () => {
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

main()
