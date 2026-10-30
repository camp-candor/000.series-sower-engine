/* eslint-disable */
import * as ActMnu from '../menu.action.js'
import * as ActOlm from '../../00.engine.unit/engine.action.js'

import type { MenuModel } from '../menu.model.js'
import type MenuBit from '../fce/menu.bit.js'
import type State from '../../99.core/state.js'

import * as Align from '../../val/align.js'
import * as Color from '../../val/console-color.js'

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
        'AUDIT ZERO-RUNTIME FENCE',
        'AUDIT AST BOUNDARY FIREWALL',
        'CHECK EMITTED ARTIFACT HYGIENE',
        'PROFILE TICK REDUCTION BUDGET',
        'ARITHMETIC KERNEL AUDIT',
        "EXECUTE BANKER'S ROUNDING SUITE",
        'RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET',
        'ARBITRARY INTEGER DIVISION SUITE',
        'ROOT MENU',
        ActOlm.UPDATE_ENGINE.split(']')[1],
        ActOlm.TEST_ENGINE.split(']')[1],
        ActOlm.LIST_ENGINE.split(']')[1],
        ActOlm.AUDIT_FENCE.split(']')[1],
        ActOlm.CHECK_ARTIFACTS.split(']')[1],
        ActOlm.AUDIT_BOUNDARY.split(']')[1],
        ActOlm.PROFILE_BUDGET.split(']')[1],
        ActOlm.STEP_TICK.split(']')[1],
        ActOlm.FAST_FORWARD_TICKS.split(']')[1],
        ActOlm.ARITHMETIC_AUDIT.split(']')[1],
        ActOlm.BANKERS_ROUNDING_SUITE.split(']')[1],
        ActOlm.CHAIN_AUDIT.split(']')[1],
        ActOlm.DIVISION_AUDIT.split(']')[1],
    ]

    const descriptions: Record<string, string> = {
        'AUDIT ZERO-RUNTIME FENCE':
            'Verify zero runtime dependencies at workspace root.',
        'AUDIT AST BOUNDARY FIREWALL':
            'Run AST boundary linter enforcing engine isolation.',
        'CHECK EMITTED ARTIFACT HYGIENE':
            'Assert zero leaked .js/.d.ts files in source units.',
        'PROFILE TICK REDUCTION BUDGET':
            'Run pure engine Vitest suite asserting <= 2ms budget.',
        'ARITHMETIC KERNEL AUDIT':
            'Assert BasisPoint float rejection and bounds guards.',
        "EXECUTE BANKER'S ROUNDING SUITE":
            'Verify 4-case Round-Half-Even scaling kernel.',
        'RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET':
            'Verify left-associative chained scaling under 10^8 bp.',
        'ARBITRARY INTEGER DIVISION SUITE':
            'Verify Round-Half-Even integer division with tie parity.',
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
                src: '>> Initiating AST Boundary Sweep...',
            })
            const res = await ste.hunt(ActOlm.AUDIT_BOUNDARY, {})
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
                src: '>> Executing Pure Engine Budget Profiling Suite...',
            })
            const res = await ste.hunt(ActOlm.PROFILE_BUDGET, {})
            const lines: string[] =
                res?.fncBit?.lst ?? (res?.fenBit?.src ? [res.fenBit.src] : [])
            for (const line of lines) {
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
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
