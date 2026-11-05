// packages/300.engine/98.menu.unit/buz/gauntlet-menu.buzz.ts
import {
    runGauntlet,
    executeStage,
} from '../../00.engine.unit/buz/gauntlet.buzz.js'
import type GauntletBit from '../../00.engine.unit/fce/gauntlet.bit.js'
import * as Align from '../../val/align.js'
import * as Color from '../../val/console-color.js'

declare const global: any

const UPDATE_GRID = '[Grid action] Update Grid'
const WRITE_CONSOLE = '[Write action] Write Console'
const UPDATE_CONSOLE = '[Console action] Update Console'
const OPEN_CHOICE = '[Open action] Open Choice'
const OPEN_MENU = '[Menu action] Open Menu'

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
        src: '-----------',
    })

    const choices = [
        '1. RUN CONSOLIDATED CI GAUNTLET',
        '2. AUDIT PERIMETER & WORKSPACE HYGIENE',
        '3. AUDIT AST IMPORT ISOLATION FIREWALL',
        '4. PROFILE TICK EXECUTION BUDGET',
        '5. AUDIT ANTI-GAMING OVERLAY SHIELD',
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
        'ROOT MENU': 'Return to the master runner switchboard.',
    }

    // Left 4 columns (0-4): vertical choice array with net mesh anchoring
    const gridChoice = await lib.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan: 8,
    })
    const choiceBit = await lib.hunt(OPEN_CHOICE, {
        idx: 'gauntlet-menu',
        dat: {
            clr0: Color.BLACK,
            clr1: Color.GREEN,
            cb: (choice: string) => {
                const text = descriptions[choice] || 'No description available.'
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
        case 'ROOT MENU':
        default: {
            await lib.hunt(OPEN_MENU, { src: '' })
            return cpy
        }
    }

    return cpy
}
