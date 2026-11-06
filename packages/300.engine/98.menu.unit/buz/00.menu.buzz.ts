/* eslint-disable */
import * as ActMnu from '../menu.action.js'
import * as ActOlm from '../../00.engine.unit/engine.action.js'
import * as ActSeq from '../../14.sequence.unit/sequence.action.js'
import * as ActDba from '../../02.database.unit/database.action.js'

import type { MenuModel } from '../menu.model.js'
import type MenuBit from '../fce/menu.bit.js'
import type State from '../../99.core/state.js'

import * as Align from '../../val/align.js'
import * as Color from '../../val/console-color.js'
import { openGauntletMenu } from './gauntlet-menu.buzz.js'
import {
    openCompileMenu,
    runParallaxCompileAudit,
} from './compile-menu.buzz.js'

let bit: any, lst: any, src: any
let rootSlv: any

const UPDATE_GRID = '[Grid action] Update Grid'
const WRITE_CONSOLE = '[Write action] Write Console'
const UPDATE_CONSOLE = '[Console action] Update Console'
const OPEN_CHOICE = '[Open action] Open Choice'
const CLOSE_TERMINAL = '[Close action] Close Terminal'
const PRINT_MENU = '[Render action] Print Menu'

export const initMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    if (bal.slv != null) rootSlv = bal.slv

    const lib = (globalThis as any).LIBRARY || (global as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        bit = await lib.hunt(UPDATE_GRID, {
            x: 4,
            y: 0,
            xSpan: 8,
            ySpan: 12,
        })
        bit = await lib.hunt(WRITE_CONSOLE, {
            idx: 'cns00',
            src: '',
            dat: { net: bit?.grdBit?.dat, src: 'alligaor0' },
        })

        bit = await lib.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '-----------',
        })
        bit = await lib.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: 'SIMULATION ENGINE',
        })
        bit = await lib.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [BEE:MANIFEST] 25 Sovereign Units Synchronized & Online',
        })
        bit = await lib.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [OK] packages/300.engine active in local isolate (Zero VRAM)',
        })
        bit = await lib.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '-----------',
        })
    }

    await updateMenu(cpy, bal, ste)

    return cpy
}

export const updateMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    const lib = (globalThis as any).LIBRARY || (global as any).LIBRARY
    if (!lib || typeof lib.hunt !== 'function') {
        if (bal?.slv) bal.slv({ mnuBit: { idx: 'update-menu-headless' } })
        return cpy
    }

    lst = [
        'OPEN GAUNTLET MENU',
        'COMPILE & PREFLIGHT PARALLAX DINNER',
        'AUDIT ZERO-RUNTIME FENCE',
        'AUDIT AST BOUNDARY FIREWALL',
        'AUDIT ANTI-GAMING OVERLAY',
        'CHECK EMITTED ARTIFACT HYGIENE',
        'PROFILE TICK REDUCTION BUDGET',
        'OPEN ARITHMETIC MENU',
        'ARITHMETIC KERNEL AUDIT',
        "EXECUTE BANKER'S ROUNDING SUITE",
        'RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET',
        'ARBITRARY INTEGER DIVISION SUITE',
        'EXECUTE BIGINT PRECISION SUITE',
        'AUDIT SEQUENCE CONCURRENCY GATE',
        'INSPECT RELATIONAL LEDGER TABLES',
        'ROOT MENU',
        ActOlm.UPDATE_ENGINE.split(']')[1],
        ActOlm.TEST_ENGINE.split(']')[1],
        ActOlm.LIST_ENGINE.split(']')[1],
        ActOlm.AUDIT_FENCE.split(']')[1],
        ActOlm.CHECK_ARTIFACTS.split(']')[1],
        ActOlm.AUDIT_BOUNDARY.split(']')[1],
        ActOlm.ANTI_GAMING_AUDIT.split(']')[1],
        ActOlm.PROFILE_BUDGET.split(']')[1],
        ActOlm.STEP_TICK.split(']')[1],
        ActOlm.FAST_FORWARD_TICKS.split(']')[1],
        ActMnu.OPEN_ARITHMETIC_MENU.split(']')[1],
        ActOlm.ARITHMETIC_AUDIT.split(']')[1],
        ActOlm.BANKERS_ROUNDING_SUITE.split(']')[1],
        ActOlm.CHAIN_AUDIT.split(']')[1],
        ActOlm.DIVISION_AUDIT.split(']')[1],
        ActOlm.BIGINT_AUDIT.split(']')[1],
    ]

    const descriptions: Record<string, string> = {
        'OPEN GAUNTLET MENU':
            'Open the Simulation Engine Cockpit to audit CI gates and tick performance.',
        'COMPILE & PREFLIGHT PARALLAX DINNER':
            'Execute 3-pass Wiregrass Basin canon compilation and Parallax Dinner pre-flight gate.',
        'AUDIT ZERO-RUNTIME FENCE':
            'Verify zero runtime dependencies at workspace root.',
        'AUDIT AST BOUNDARY FIREWALL':
            'Run AST boundary linter enforcing engine isolation.',
        'AUDIT ANTI-GAMING OVERLAY':
            'Restore held-out test overlay and verify anti-gaming baseline.',
        'CHECK EMITTED ARTIFACT HYGIENE':
            'Assert zero leaked .js/.d.ts files in source units.',
        'PROFILE TICK REDUCTION BUDGET':
            'Run pure engine Vitest suite asserting <= 2ms budget.',
        'OPEN ARITHMETIC MENU':
            'Open Arithmetic Kernel Cockpit (Bounds, Banker Rounding, Gauntlet).',
        'ARITHMETIC KERNEL AUDIT':
            'Assert BasisPoint float rejection and bounds guards.',
        "EXECUTE BANKER'S ROUNDING SUITE":
            'Verify 4-case Round-Half-Even scaling kernel.',
        'RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET':
            'Verify left-associative chained scaling under 10^8 bp.',
        'ARBITRARY INTEGER DIVISION SUITE':
            'Verify Round-Half-Even integer division with tie parity.',
        'EXECUTE BIGINT PRECISION SUITE':
            'Verify 64-bit high magnitude BigInt precision and Round-Half-Even.',
        'AUDIT SEQUENCE CONCURRENCY GATE':
            'Verify OCC sequence token validation, monotonic progression, and continuity.',
        'INSPECT RELATIONAL LEDGER TABLES':
            'Inspect in-memory Four-Vector relational ledger tables and audit zero-IO status.',
        'ROOT MENU': 'Return to the master runner switchboard.',
    }

    bit = await lib.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan: 12,
    })
    bit = await lib.hunt(OPEN_CHOICE, {
        dat: {
            clr0: Color.BLACK,
            clr1: Color.YELLOW,
            cb: (choice: string) => {
                const text = descriptions[choice] || 'No description available.'
                text.split('\n').forEach((s: string) =>
                    lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: s }),
                )
            },
        },
        src: Align.VERTICAL,
        lst,
        net: bit?.grdBit?.dat,
    })

    src = bit?.chcBit?.src

    switch (src) {
        case 'OPEN GAUNTLET MENU': {
            await openGauntletMenu(cpy, bal, ste)
            break
        }

        case 'COMPILE & PREFLIGHT PARALLAX DINNER': {
            await runParallaxCompileAudit(cpy, bal, ste)
            await openCompileMenu(cpy, bal, ste)
            break
        }

        case 'AUDIT ZERO-RUNTIME FENCE':
        case ActOlm.AUDIT_FENCE.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> Initiating Zero-Runtime Fence Audit...',
            })
            const res = await ste.hunt(ActOlm.AUDIT_FENCE, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case 'AUDIT AST BOUNDARY FIREWALL':
        case ActOlm.AUDIT_BOUNDARY.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [BOUNDARY] Running AST dependency firewall sweep...',
            })
            const res = await ste.hunt(ActOlm.AUDIT_BOUNDARY, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case 'AUDIT ANTI-GAMING OVERLAY':
        case ActOlm.ANTI_GAMING_AUDIT.split(']')[1]: {
            const res = await ste.hunt(ActOlm.ANTI_GAMING_AUDIT, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case 'CHECK EMITTED ARTIFACT HYGIENE':
        case ActOlm.CHECK_ARTIFACTS.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> Scanning source tree for compilation debris...',
            })
            const res = await ste.hunt(ActOlm.CHECK_ARTIFACTS, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case 'PROFILE TICK REDUCTION BUDGET':
        case ActOlm.PROFILE_BUDGET.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [BUDGET:INIT] Priming V8 isolate and mounting nanosecond BigInt timer...',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [BUDGET:STEP] Executing 17.tick.unit state reduction under 2ms ceiling...',
            })
            const res = await ste.hunt(ActOlm.PROFILE_BUDGET, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            if (res?.fenBit?.idx === 'profile-budget-ok') {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [SUCCESS] Pure engine reduction budget verified at T_0 = $0.00',
                })
            }
            break
        }

        case ActOlm.UPDATE_ENGINE.split(']')[1]:
            bit = await ste.hunt(ActOlm.UPDATE_ENGINE, {
                content: 'Engine Menu Selected',
            })
            bit = await lib.hunt(PRINT_MENU, bit)
            break

        case ActOlm.TEST_ENGINE.split(']')[1]:
            bit = await ste.hunt(ActOlm.TEST_ENGINE, {
                content: 'Engine Menu Selected',
            })
            bit = await lib.hunt(PRINT_MENU, bit)
            break

        case ActOlm.LIST_ENGINE.split(']')[1]:
            bit = await ste.hunt(ActOlm.LIST_ENGINE, {})
            lst = bit?.olmBit?.lst || []

            if (lst.length === 0) {
                bit = await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: 'No Engine Models Found',
                })
            } else {
                bit = await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: 'Listing Engine Models...',
                })
                lst.forEach((a: string) =>
                    lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: a,
                    }),
                )
            }
            break

        case 'OPEN ARITHMETIC MENU':
        case ActMnu.OPEN_ARITHMETIC_MENU:
        case ActMnu.OPEN_ARITHMETIC_MENU.split(']')[1]: {
            await ste.hunt(ActMnu.OPEN_ARITHMETIC_MENU, { slv: rootSlv })
            return cpy
        }

        case 'ARITHMETIC KERNEL AUDIT':
        case ActOlm.ARITHMETIC_AUDIT.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> Initiating Arithmetic Kernel Audit...',
            })
            const res = await ste.hunt(ActOlm.ARITHMETIC_AUDIT, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case "EXECUTE BANKER'S ROUNDING SUITE":
        case ActOlm.BANKERS_ROUNDING_SUITE.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> Executing Banker Rounding Suite...',
            })
            const res = await ste.hunt(ActOlm.BANKERS_ROUNDING_SUITE, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case 'RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET':
        case ActOlm.CHAIN_AUDIT.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> Executing Chained Scaling Audit...',
            })
            const res = await ste.hunt(ActOlm.CHAIN_AUDIT, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case 'ARBITRARY INTEGER DIVISION SUITE':
        case ActOlm.DIVISION_AUDIT.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> Executing Arbitrary Integer Division Audit...',
            })
            const res = await ste.hunt(ActOlm.DIVISION_AUDIT, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case 'EXECUTE BIGINT PRECISION SUITE':
        case ActOlm.BIGINT_AUDIT.split(']')[1]: {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> Executing BigInt Precision Suite...',
            })
            const res = await ste.hunt(ActOlm.BIGINT_AUDIT, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
            }
            break
        }

        case ActOlm.STEP_TICK.split(']')[1]:
            bit = await ste.hunt(ActOlm.STEP_TICK, {})
            bit = await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: bit?.fenBit?.src,
            })
            break

        case ActOlm.FAST_FORWARD_TICKS.split(']')[1]:
            bit = await ste.hunt(ActOlm.FAST_FORWARD_TICKS, {})
            bit = await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: bit?.fenBit?.src,
            })
            break

        case 'AUDIT SEQUENCE CONCURRENCY GATE': {
            await ste.hunt(ActSeq.INIT_SEQUENCE, {
                val: 104,
                src: 'wiregrass-basin',
            })
            await ste.hunt(ActSeq.ASSERT_EXPECTED_SEQ, {
                val: 104,
            })
            await ste.hunt(ActSeq.COMMIT_SEQUENCE, {
                val: 105,
                dat: { incomingSeq: 105, eventId: 'evt_seq_105' },
            })
            await ste.hunt(ActSeq.VERIFY_SEQUENCE_CONTINUITY, {
                dat: {
                    envelopes: [{ sequenceId: 104 }, { sequenceId: 105 }],
                },
            })
            break
        }

        case 'INSPECT RELATIONAL LEDGER TABLES':
        case 'AUDIT 4-VECTOR STATE & TABLES':
        case 'INSPECT 4-VECTOR STATE & SQLITE TABLES':
        case ActDba.CHECK_INTEGRITY_DATABASE:
        case ActDba.CHECK_INTEGRITY_DATABASE.split(']')[1]: {
            await ste.hunt(ActDba.ENSURE_SCHEMA_DATABASE, {})
            await ste.hunt(ActDba.CHECK_INTEGRITY_DATABASE, {})
            break
        }

        case 'ROOT MENU':
            if (rootSlv != null) rootSlv({ mnuBit: { idx: 'root-menu' } })
            return cpy

        default:
            bit = await ste.hunt(CLOSE_TERMINAL, {})
            break
    }

    setTimeout(async () => {
        bit = await ste.hunt(ActMnu.UPDATE_MENU, {})
    }, 333)

    return cpy
}
