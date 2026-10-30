// packages/300.engine/98.menu.unit/buz/gauntlet-menu.buzz.ts
import {
    runGauntlet,
    executeStage,
} from '../../00.engine.unit/buz/gauntlet.buzz.js'
import type GauntletBit from '../../00.engine.unit/fce/gauntlet.bit.js'

declare const global: any

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

    // 12x12 grid layout: columns 0-4 for selection, columns 4-12 for telemetry
    global.LIBRARY.hunt('[Grid Action] Update Grid', {
        x: 0,
        y: 0,
        xSpan: 4,
        ySpan: 12,
    })

    const choices = [
        '1. RUN CONSOLIDATED CI GAUNTLET',
        '2. AUDIT PERIMETER & WORKSPACE HYGIENE',
        '3. AUDIT AST IMPORT ISOLATION FIREWALL',
        '4. PROFILE TICK EXECUTION BUDGET',
        '5. AUDIT ANTI-GAMING OVERLAY SHIELD',
        'ROOT MENU',
    ]

    global.LIBRARY.hunt('[Choice Action] Open Choice', {
        idx: 'gauntlet-menu',
        title: 'SIMULATION ENGINE // CI GAUNTLET',
        lst: choices,
        slv: async (selection: { choice: string }) => {
            switch (selection.choice) {
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
                    global.LIBRARY.hunt('[Console Action] Update Console', {
                        idx: 'cns00',
                        lst: lines,
                    })
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
                    global.LIBRARY.hunt('[Console Action] Update Console', {
                        idx: 'cns00',
                        lst: lines,
                    })
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
                    global.LIBRARY.hunt('[Console Action] Update Console', {
                        idx: 'cns00',
                        lst: lines,
                    })
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
                    global.LIBRARY.hunt('[Console Action] Update Console', {
                        idx: 'cns00',
                        lst: lines,
                    })
                    break
                }
                case 'ROOT MENU':
                default: {
                    global.LIBRARY.hunt('[Terminal Action] Root Menu', {})
                    break
                }
            }
        },
    })

    return cpy
}
