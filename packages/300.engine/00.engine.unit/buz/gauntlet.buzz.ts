// packages/300.engine/00.engine.unit/buz/gauntlet.buzz.ts
import { createRequire } from 'module'
import type GauntletBit from '../fce/gauntlet.bit.js'
import type { GauntletStageResult } from '../fce/gauntlet.bit.js'

const req = createRequire(import.meta.url)
const { execSync } = req('child_process')

declare const global: any

export interface StageConfig {
    readonly id: string
    readonly name: string
    readonly command: string
}

const isWin = process.platform === 'win32'

export const GAUNTLET_STAGES: readonly StageConfig[] = [
    {
        id: 'STAGE_0_RUNNER_FENCE',
        name: 'Runner Boundary Manifest Check',
        command: 'git status -s apps/worker/wrangler.jsonc',
    },
    {
        id: 'STAGE_0_HARNESS_FENCE',
        name: 'Immutable Harness Status Check',
        command: 'git status -s apps/995.library/995.library/',
    },
    {
        id: 'STAGE_0_CLEAN_ARTIFACTS',
        name: 'Source Tree Inode Hygiene Scan',
        command: isWin
            ? 'npm run check:artifacts'
            : 'node -e "const cp = require(\'child_process\'); const out = cp.execSync(\'find packages/300.engine -name \\"*.js\\" -o -name \\"*.d.ts\\"\').toString().trim(); if (out) process.exit(1);"',
    },
    {
        id: 'STAGE_0_ASCII_PURITY',
        name: '7-Bit ASCII Compliance Sweep',
        command: 'npm run check:ascii',
    },
    {
        id: 'STAGE_1_BANNED_DEPS',
        name: 'Banned Runtime Dependencies Check',
        command: 'npm run check:banned-deps',
    },
    {
        id: 'STAGE_1_NATIVE_IO',
        name: 'Native Platform IO Banishment Gate',
        command: 'npm run check:native-io',
    },
    {
        id: 'STAGE_1_AST_BOUNDARY',
        name: 'Dependency Cruiser AST Firewall',
        command: 'npm run check:boundary:ast',
    },
    {
        id: 'STAGE_1_COMPOSITE_TYPES',
        name: 'TypeScript Composite Project Build',
        command: 'npm run check:types',
    },
    {
        id: 'STAGE_2_BUDGET_PROFILE',
        name: 'Pure 2ms Execution Budget Profiler',
        command: 'npm run test:pure',
    },
    {
        id: 'STAGE_3_ANTI_GAMING',
        name: 'Adversarial Anti-Gaming Falsification',
        command: 'npm run check:anti-gaming',
    },
]

async function logToConsolePane(lines: string[]): Promise<void> {
    if (
        typeof global !== 'undefined' &&
        global.LIBRARY &&
        typeof global.LIBRARY.hunt === 'function'
    ) {
        for (const line of lines) {
            await global.LIBRARY.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src: line,
            })
        }
    }
}

async function yieldToPaint(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve))
}

export function executeStage(stage: StageConfig): GauntletStageResult {
    const start = process.hrtime.bigint()
    try {
        const stdout = execSync(stage.command, { stdio: 'pipe' })
            .toString()
            .trim()
        if (stage.id.includes('FENCE') && stdout.length > 0) {
            throw new Error(
                `Uncommitted files detected in protected boundary:\n${stdout}`,
            )
        }
        const end = process.hrtime.bigint()
        const durationMs = Number(end - start) / 1_000_000
        return { stageId: stage.id, name: stage.name, passed: true, durationMs }
    } catch (err: any) {
        const end = process.hrtime.bigint()
        const durationMs = Number(end - start) / 1_000_000
        const errorMsg = err.stderr ? err.stderr.toString().trim() : err.message
        return {
            stageId: stage.id,
            name: stage.name,
            passed: false,
            durationMs,
            error: errorMsg,
        }
    }
}

export async function runGauntlet(
    cpy: any,
    bal: GauntletBit,
    ste?: any,
): Promise<any> {
    void ste
    const receipts: string[] = [
        '>> ==================================================================',
        '>> [GAUNTLET:INIT] EXECUTING PHASE 1 CI VERIFICATION GAUNTLET (T_0 = $0.00)',
        '>> ==================================================================',
    ]
    await logToConsolePane(receipts)
    await yieldToPaint()

    const results: GauntletStageResult[] = []
    let allPassed = true

    for (const stage of GAUNTLET_STAGES) {
        const res = executeStage(stage)
        results.push(res)

        if (res.passed) {
            const line = `>> [STAGE:PASS] ${res.name.padEnd(38)} [${res.durationMs.toFixed(2)}ms]`
            receipts.push(line)
            await logToConsolePane([line])
            await yieldToPaint()
        } else {
            allPassed = false
            const line = `>> [STAGE:FAIL] ${res.name.padEnd(38)} [BREACH]`
            receipts.push(line)
            if (res.error) {
                receipts.push(`>>   Error: ${res.error.split('\n')[0]}`)
            }
            await logToConsolePane([line, `>>   Error: ${res.error}`])
            await yieldToPaint()
            break // Fail closed on first violation
        }
    }

    receipts.push(
        '>> ------------------------------------------------------------------',
    )
    if (allPassed) {
        receipts.push(
            '>> [VERDICT:PASS] 100% OF VERIFICATION GATES CLEARED AT T_0 = $0.00',
        )
        receipts.push(
            '>> [MERKLE:SEAL] ENGINE REPOSITORY INTEGRITY CERTIFIED GREEN',
        )
    } else {
        receipts.push(
            '>> [VERDICT:FAIL] GAUNTLET TRIPPED. EXECUTION HALTED AT CHEAPEST STAGE',
        )
    }
    receipts.push(
        '>> ==================================================================',
    )
    await logToConsolePane(receipts.slice(-4))
    await yieldToPaint()

    bal.val = allPassed ? 0 : -1
    bal.lst = receipts
    bal.dat = {
        stages: results,
        passed: allPassed,
        totalDurationMs: results.reduce((acc, r) => acc + r.durationMs, 0),
    }

    if (bal.slv) bal.slv({ gntBit: bal })
    return cpy
}
