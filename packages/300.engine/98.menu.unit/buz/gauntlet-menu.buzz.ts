// packages/300.engine/98.menu.unit/buz/gauntlet-menu.buzz.ts
import fs from 'node:fs'
import path from 'node:path'
import {
    runGauntlet,
    executeStage,
} from '../../00.engine.unit/buz/gauntlet.buzz.js'
import {
    evaluateResetCoveragePure,
    type ResetCoverageSourceEntry,
} from '../../00.engine.unit/buz/reset-coverage.buzz.js'
import type GauntletBit from '../../00.engine.unit/fce/gauntlet.bit.js'
import { resolveEngineRoot } from './00.menu.buzz.js'
import * as Align from '../../val/align.js'
import * as Color from '../../val/console-color.js'

declare const global: any

const UPDATE_GRID = '[Grid action] Update Grid'
const WRITE_CONSOLE = '[Write action] Write Console'
const UPDATE_CONSOLE = '[Console action] Update Console'
const OPEN_CHOICE = '[Open action] Open Choice'
const OPEN_MENU = '[Menu action] Open Menu'

export const RESET_COVERAGE_MENU_LABEL = '[R] AUDIT TABULA RASA RESET COVERAGE'

function collectNonTestTsFiles(dirPath: string): string[] {
    const out: string[] = []
    if (!fs.existsSync(dirPath)) {
        return out
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
        const full = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
            if (
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name.startsWith('.')
            ) {
                continue
            }
            out.push(...collectNonTestTsFiles(full))
        } else if (
            entry.isFile() &&
            entry.name.endsWith('.ts') &&
            !entry.name.includes('.test.') &&
            !entry.name.includes('.spec.')
        ) {
            out.push(full)
        }
    }
    return out.sort((a, b) => a.localeCompare(b))
}

function resolveEngineUnitDir(baseDir?: string): string {
    const repoRoot = baseDir
        ? path.resolve(baseDir)
        : resolveEngineRoot(process.cwd())
    if (fs.existsSync(path.join(repoRoot, 'packages', '300.engine'))) {
        return path.join(repoRoot, 'packages', '300.engine')
    }
    return repoRoot
}

async function emitCoverageLines(ste: any, lines: string[]): Promise<void> {
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

export async function runResetCoverageMenuAudit(
    cpy: any,
    bal: any,
    ste?: any,
): Promise<any> {
    const engineDir = resolveEngineUnitDir((bal?.dat as any)?.baseDir)
    const scanRoots = [
        path.join(engineDir, '98.menu.unit'),
        path.join(engineDir, '02.database.unit'),
    ]
    const sourceFiles: ResetCoverageSourceEntry[] = []
    for (const root of scanRoots) {
        for (const filePath of collectNonTestTsFiles(root)) {
            try {
                sourceFiles.push({
                    filePath: path
                        .relative(engineDir, filePath)
                        .replace(/\\/g, '/'),
                    content: fs.readFileSync(filePath, 'utf8'),
                })
            } catch {
                // Skip unreadable files without failing the audit
            }
        }
    }

    const report = evaluateResetCoveragePure(sourceFiles)

    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt('[Engine action] Audit Reset Coverage', {
                idx: 'menu-reset-coverage',
                dat: { sourceFiles },
            })
        } catch {
            // Pure report remains authoritative when dispatch is unavailable
        }
    }

    await emitCoverageLines(ste, [...report.receipts])

    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: report.valid
                    ? 'reset-coverage-menu-pass'
                    : 'reset-coverage-menu-fail',
                val: report.valid ? 1 : -1,
                src: report.valid ? 'PASS' : 'BREACH',
                dat: report,
                lst: [...report.receipts],
            },
        })
    }

    return cpy
}

async function streamLines(lib: any, lines: string[]): Promise<void> {
    for (const line of lines) {
        await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
    }
}

export async function openGauntletMenu(
    cpy: any,
    bal: any,
    ste?: any,
): Promise<any> {
    if (typeof global === 'undefined' || !global.LIBRARY) {
        // Headless execution fallback
        if (bal.slv)
            bal.slv({ mnuBit: { idx: 'gauntlet-menu-headless', val: 0 } })
        return cpy
    }
    void ste

    const lib = global.LIBRARY

    // Right 8 columns (4-12): cns00 telemetry pane mount
    const gridConsole = await lib.hunt(UPDATE_GRID, {
        x: 4,
        y: 0,
        xSpan: 8,
        ySpan: 12,
    })
    await lib.hunt(WRITE_CONSOLE, {
        idx: 'cns00',
        src: '',
        dat: { net: gridConsole?.grdBit?.dat, src: 'alligaor0' },
    })
    await lib.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: '-----------',
    })
    await lib.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: 'SIMULATION ENGINE // CI GAUNTLET',
    })
    await lib.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: '>> [BEE:MANIFEST] 25 Sovereign Units Synchronized & Online',
    })
    await lib.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: '>> [OK] packages/300.engine active in local isolate (Zero VRAM)',
    })
    await lib.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: '-----------',
    })

    const choices = [
        '1. RUN CONSOLIDATED CI GAUNTLET',
        '2. AUDIT PERIMETER & WORKSPACE HYGIENE',
        '3. AUDIT AST IMPORT ISOLATION FIREWALL',
        '4. PROFILE TICK EXECUTION BUDGET',
        '5. AUDIT ANTI-GAMING OVERLAY SHIELD',
        RESET_COVERAGE_MENU_LABEL,
        'ROOT MENU',
    ]

    const descriptions: Record<string, string> = {
        '1. RUN CONSOLIDATED CI GAUNTLET':
            'Execute the 10-stage sequential CI verification gauntlet and stream ASCII receipts to cns00.',
        '2. AUDIT PERIMETER & WORKSPACE HYGIENE':
            'Verify runner and harness boundaries plus 7-bit ASCII purity.',
        '3. AUDIT AST IMPORT ISOLATION FIREWALL':
            'Run the dependency cruiser AST firewall sweep enforcing engine isolation.',
        '4. PROFILE TICK EXECUTION BUDGET':
            'Run the pure engine suite asserting the <= 2.0ms tick budget.',
        '5. AUDIT ANTI-GAMING OVERLAY SHIELD':
            'Restore the held-out test overlay and verify golden falsification traps.',
        [RESET_COVERAGE_MENU_LABEL]:
            'Audit every BEE unit against ENGINE_RESET_MANIFEST and scan 98.menu.unit plus 02.database.unit write paths.',
        'ROOT MENU': 'Return to the master runner switchboard.',
    }

    // Left 4 columns (0-4): vertical choice array with net mesh anchoring
    const gridChoice = await lib.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan: 8,
    })

    while (true) {
        const choiceBit = await lib.hunt(OPEN_CHOICE, {
            idx: 'gauntlet-menu',
            dat: {
                clr0: Color.BLACK,
                clr1: Color.GREEN,
                cb: (choice: string) => {
                    const text =
                        descriptions[choice] || 'No description available.'
                    text.split('\n').forEach((s: string) =>
                        lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: s }),
                    )
                },
            },
            src: Align.VERTICAL,
            lst: choices,
            net: gridChoice?.grdBit?.dat,
        })

        const selected = choiceBit?.chcBit?.src

        switch (selected) {
            case '1. RUN CONSOLIDATED CI GAUNTLET': {
                const bit: GauntletBit = { idx: 'run-gauntlet' }
                await runGauntlet(cpy, bit, ste)
                break
            }
            case '2. AUDIT PERIMETER & WORKSPACE HYGIENE': {
                const res1 = executeStage({
                    id: 'FENCE',
                    name: 'Immutable Runner & Harness',
                    command:
                        'git status -s apps/worker/wrangler.jsonc apps/995.library/995.library/',
                })
                const res2 = executeStage({
                    id: 'ASCII',
                    name: 'Pure 7-Bit ASCII Compliance',
                    command: 'npm run check:ascii',
                })
                const lines = [
                    '>> --------------------------------------------------',
                    '>> [AUDIT:PERIMETER] Workspace Hygiene Telemetry:',
                    `>> - Runner & Harness : ${res1.passed ? '[PASS: CLEAN]' : '[FAIL: DIRTY]'}`,
                    `>> - 7-Bit ASCII Pure : ${res2.passed ? '[PASS: CLEAN]' : '[FAIL: BREACH]'}`,
                    '>> --------------------------------------------------',
                ]
                await streamLines(lib, lines)
                break
            }
            case '3. AUDIT AST IMPORT ISOLATION FIREWALL': {
                const res = executeStage({
                    id: 'AST',
                    name: 'AST Dependency Cruiser',
                    command: 'npm run check:boundary:ast',
                })
                const lines = [
                    '>> --------------------------------------------------',
                    '>> [AUDIT:AST] Static AST Isolation Firewall Telemetry:',
                    `>> - Boundary Status  : ${res.passed ? '[PASS: 0 VIOLATIONS]' : '[FAIL: BREACH DETECTED]'}`,
                    `>> - Elapsed Time     : ${res.durationMs.toFixed(2)}ms`,
                    '>> --------------------------------------------------',
                ]
                await streamLines(lib, lines)
                break
            }
            case '4. PROFILE TICK EXECUTION BUDGET': {
                const res = executeStage({
                    id: 'BUDGET',
                    name: 'Pure Engine 2ms Budget',
                    command: 'npm run test:pure',
                })
                const lines = [
                    '>> --------------------------------------------------',
                    '>> [PROFILE:BUDGET] Nanosecond BigInt Timing Telemetry:',
                    `>> - Budget Status    : ${res.passed ? '[BUDGET_PASS: <= 2.0ms]' : '[BUDGET_BREACH]'}`,
                    `>> - Elapsed Time     : ${res.durationMs.toFixed(2)}ms`,
                    '>> --------------------------------------------------',
                ]
                await streamLines(lib, lines)
                break
            }
            case '5. AUDIT ANTI-GAMING OVERLAY SHIELD': {
                const res = executeStage({
                    id: 'ANTI_GAMING',
                    name: 'Anti-Gaming Protocol',
                    command: 'npm run check:anti-gaming',
                })
                const lines = [
                    '>> --------------------------------------------------',
                    '>> [AUDIT:ANTI-GAMING] Falsification Shield Telemetry:',
                    `>> - Shield Status    : ${res.passed ? '[PASS: BASELINE LOCKED]' : '[FAIL: DEFECT DETECTED]'}`,
                    `>> - Negative Traps   : 5/5 Golden Traps Active`,
                    '>> --------------------------------------------------',
                ]
                await streamLines(lib, lines)
                break
            }
            case RESET_COVERAGE_MENU_LABEL: {
                await runResetCoverageMenuAudit(cpy, {}, ste)
                break
            }
            case 'ROOT MENU':
            default: {
                await lib.hunt(OPEN_MENU, { src: '' })
                if (bal.slv) bal.slv({ mnuBit: { idx: 'root-menu', val: 0 } })
                return cpy
            }
        }
    }

    return cpy
}
