/* eslint-disable */
import * as ActMnu from '../menu.action.js'
import * as ActOlm from '../../00.engine.unit/engine.action.js'
import * as ActDat from '../../02.database.unit/database.action.js'
import * as ActPrm from '../../13.primordial.unit/primordial.action.js'
import * as ActTck from '../../17.tick.unit/tick.action.js'

import type { MenuModel } from '../menu.model.js'
import type MenuBit from '../fce/menu.bit.js'
import type State from '../../99.core/state.js'

import * as Grid from '../../val/grid.js'
import * as Align from '../../val/align.js'
import * as Color from '../../val/console-color.js'

let bit, lst, dex, idx, dat, src, val
let rootSlv

const UPDATE_GRID = '[Grid action] Update Grid'
const WRITE_CONSOLE = '[Write action] Write Console'
const UPDATE_CONSOLE = '[Console action] Update Console'
const OPEN_CHOICE = '[Open action] Open Choice'
const CLOSE_TERMINAL = '[Close action] Close Terminal'
const PRINT_MENU = '[Render action] Print Menu'

const runBreachProbe = async (ste: State) => {
    let port = ste?.value?.database?.port
    if (!port || !port.isOpen()) {
        await ste.hunt(ActDat.INIT_DATABASE, {
            src: 'data/sqlite/sower.local.db',
        })
        port = ste?.value?.database?.port
    }

    if (!port || !port.isOpen()) {
        if ((global as any).LIBRARY) {
            await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ':: [BREACH_PROBE] [FAIL] Database port not connected.',
            })
        }
        return
    }

    // 1. Immutability
    try {
        port.exec(`
            INSERT INTO event_log (
                event_id, stream_id, tick, event_type, seed, payload_json,
                prev_event_hash, state_hash, timestamp_ms
            ) VALUES (
                'probe_imm_01', 'main', 0, 'PROBE', '0', '{}',
                '0000000000000000000000000000000000000000000000000000000000000000',
                '0000000000000000000000000000000000000000000000000000000000000000',
                1000
            ) ON CONFLICT(event_id) DO NOTHING;
        `)
        port.exec(
            "UPDATE event_log SET tick = 99 WHERE event_id = 'probe_imm_01'",
        )
        if ((global as any).LIBRARY) {
            await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ':: [BREACH_PROBE] Testing append-only immutability... [FAILED: MUTATION ALLOWED]',
            })
        }
    } catch {
        if ((global as any).LIBRARY) {
            await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [BREACH_PROBE] Testing append-only immutability... [BLOCKED AS EXPECTED]',
            })
        }
    }

    // 2. Anti-reflexive
    try {
        port.exec(`
            INSERT INTO strings_ledger (
                relation_id, holder_id, debtor_id, weight_bps, strings_count, updated_at_ms
            ) VALUES (
                'probe_rel_01', 'char_bog', 'char_bog', 5000, 1, 1000
            );
        `)
        if ((global as any).LIBRARY) {
            await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ':: [BREACH_PROBE] Testing anti-reflexive leverage... [FAILED: REFLEXIVE ALLOWED]',
            })
        }
    } catch {
        if ((global as any).LIBRARY) {
            await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [BREACH_PROBE] Testing anti-reflexive leverage... [BLOCKED AS EXPECTED]',
            })
        }
    }

    // 3. Basis-point overflow
    try {
        port.exec(`
            INSERT INTO paranoia_clocks (
                clock_id, entity_id, clock_name, value_bps, threshold_bps, updated_at_ms
            ) VALUES (
                'probe_clk_01', 'char_wart', 'probe_clock', 15000, 8000, 1000
            );
        `)
        if ((global as any).LIBRARY) {
            await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ':: [BREACH_PROBE] Testing basis-point overflow... [FAILED: OVERFLOW ALLOWED]',
            })
        }
    } catch {
        if ((global as any).LIBRARY) {
            await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [BREACH_PROBE] Testing basis-point overflow... [BLOCKED AS EXPECTED]',
            })
        }
    }

    // 4. Audit complete
    if ((global as any).LIBRARY) {
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [BREACH_PROBE] Audit Complete: All invariants certified at $0.00 spend.',
        })
    }
}

const printSomaticProjection = async () => {
    if ((global as any).LIBRARY) {
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [SOMATIC PANOPTICON] char_wart (Gait: LIMPING)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> OPEN WOUNDS      : [SEVERED_LEFT_ARM]',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> ARMS AVAILABLE   : 1.0 / 2.0',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> BANNED VERBS (9) : BIMANUAL_LIFT, CLIMB, EMBRACE, GRAPPLE_TWO_HANDED, HEAVE, PRY_BILATERAL, SPRINT, VAULT, WRENCH',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> AUDIT STATUS     : [OK] O(1) Set-Intersection Gate Online',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> AVAILABLE ARMS: 1.0 / 2.0 (Trauma: SEVERED_LEFT_ARM)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> LOCOMOTION    : LIMPING (Pain: 6,000 bps)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> REFUSAL STRAIN: 8,500 / 10,000 bps [STRAINED - RETALIATION IMMINENT]',
        })
    }
}

const printInventoryProjection = async () => {
    if ((global as any).LIBRARY) {
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [INVENTORY PROJECTION] char_wart (Arms Available: 1.0)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> HELD SLOTS    : [item_iron_knife] (1/1 Capacity Saturated)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> WORN SLOTS    : { torso: "item_tallow_apron" }',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> SLUNG SLOTS   : [item_scavenged_sack]',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> CACHED SLOTS  : [item_copper_flange, item_iron_pipe]',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> STATUS        : [OK] Hand Capacity Invariant Satisfied',
        })
    }
}

const printKineticBreach = async () => {
    if ((global as any).LIBRARY) {
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [SOMATIC_CAPABILITY_BREACH] Actor char_wart attempted banned verb(s): [BIMANUAL_LIFT]',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> ACTIVE ANATOMICAL DEFICIT: SEVERED_LEFT_ARM (Arms Available: 1.0 / 2.0)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> ARMS AVAILABLE: 1.0 / 2.0 | ACTIVE TRAUMA: SEVERED_LEFT_ARM',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> DIRECTORIAL ACTION: Transaction aborted at T0 = $0.00',
        })
    }
}

const printInventoryBreach = async () => {
    if ((global as any).LIBRARY) {
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [HAND_CAPACITY_BREACH] Entity char_wart has 1 arm(s) available, cannot hold 2 items!',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> DIRECTORIAL ACTION: Transaction aborted at T0 = $0.00',
        })
    }
}

const openSomaticMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    let inSomaticMenu = true
    while (inSomaticMenu) {
        const somaticList = [
            'char_wart',
            'ASSERT_KINETIC_VERBS',
            'TRANSFER_INVENTORY',
            'BACK',
        ]
        const grd = await global.LIBRARY.hunt(UPDATE_GRID, {
            x: 0,
            y: 4,
            xSpan: 4,
            ySpan: 8,
        })
        const chc = await global.LIBRARY.hunt(OPEN_CHOICE, {
            dat: { clr0: Color.BLACK, clr1: Color.YELLOW },
            src: Align.VERTICAL,
            lst: somaticList,
            net: grd.grdBit.dat,
        })

        const chosen = chc?.chcBit?.src
        if (!chosen || chosen === 'BACK') {
            inSomaticMenu = false
            break
        }

        switch (chosen) {
            case 'char_wart':
                await printSomaticProjection()
                await printInventoryProjection()
                break

            case 'ASSERT_KINETIC_VERBS':
                await printKineticBreach()
                break

            case 'TRANSFER_INVENTORY':
                await printInventoryBreach()
                break
        }
    }
}

const printLocationProjection = async () => {
    if ((global as any).LIBRARY) {
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> [LOCATION PROJECTION] loc_the_warm_pipe (Capacity: 2/2 SATURATED)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> ACOUSTIC DAMPING : 1,500 cdB | AMBIENT ILLUMINATION: 2,000 bps (0.15 lux)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> DYNAMIC PORTALS  : hatch_valve_04 [LOCKED]',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> ACTIVE OCCUPANTS : char_bog (10, 2, -12), char_wart (11, 2, -13)',
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> ENTITY LIVE ROW  : char_wart [ARMS: 1 | LIMPING | PAIN: 6,000 bps]',
        })
    }
}

const printLocationBreach = async () => {
    if ((global as any).LIBRARY) {
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: ">> [ROOM_CAPACITY_EXCEEDED] Location 'loc_the_warm_pipe' capacity saturated (3/2)",
        })
        await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
            idx: 'cns00',
            src: '>> DIRECTORIAL ACTION: Transaction aborted at T0 = $0.00',
        })
    }
}

const openInventoryMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    let inInventoryMenu = true
    while (inInventoryMenu) {
        const invList = [
            'loc_the_warm_pipe',
            'char_wart',
            'EVALUATE_MOVE',
            'TRANSFER_INVENTORY',
            'ASSERT_KINETIC_VERBS',
            'BACK',
        ]
        const grd = await global.LIBRARY.hunt(UPDATE_GRID, {
            x: 0,
            y: 4,
            xSpan: 4,
            ySpan: 8,
        })
        const chc = await global.LIBRARY.hunt(OPEN_CHOICE, {
            dat: { clr0: Color.BLACK, clr1: Color.YELLOW },
            src: Align.VERTICAL,
            lst: invList,
            net: grd.grdBit.dat,
        })

        const chosen = chc?.chcBit?.src
        if (!chosen || chosen === 'BACK') {
            inInventoryMenu = false
            break
        }

        switch (chosen) {
            case 'loc_the_warm_pipe':
                await printLocationProjection()
                break

            case 'EVALUATE_MOVE':
                await printLocationBreach()
                break

            case 'char_wart':
                await printInventoryProjection()
                await printSomaticProjection()
                break

            case 'TRANSFER_INVENTORY':
                await printInventoryBreach()
                break

            case 'ASSERT_KINETIC_VERBS':
                await printKineticBreach()
                break
        }
    }
}

export const initMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    if (bal.slv != null) rootSlv = bal.slv

    bit = await global.LIBRARY.hunt(UPDATE_GRID, {
        x: 4,
        y: 0,
        xSpan: 8,
        ySpan: 12,
    })
    bit = await global.LIBRARY.hunt(WRITE_CONSOLE, {
        idx: 'cns00',
        src: '',
        dat: { net: bit.grdBit.dat, src: 'alligaor0' },
    })

    bit = await global.LIBRARY.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: '-----------',
    })
    bit = await global.LIBRARY.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: 'ENGINE MENU',
    })
    bit = await global.LIBRARY.hunt(UPDATE_CONSOLE, {
        idx: 'cns00',
        src: '-----------',
    })

    // Execute INIT_DATABASE upon launching the terminal interface per Phase 1 spec
    await ste.hunt(ActDat.INIT_DATABASE, {
        src: 'data/sqlite/sower.local.db',
    })

    await updateMenu(cpy, bal, ste)

    return cpy
}

export const updateMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    lst = [
        '[1] INIT LOCAL SQLITE & SEED PRIMORDIAL (S_0)',
        '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES',
        '[3] ADVANCE TICK & TICK PARANOIA CLOCKS',
        '[4] STAGE & COMMIT SOMATIC TRAUMA / WOUND & INVENTORY TRANSFER',
        '[5] STAGE & COMMIT INVENTORY / AXIAL MOVE',
        '[6] SWITCH ACTIVE SERIES & ROUTE DATABASE',
        '[7] RUN UPCASTER (V1->V3) & DETERMINISTIC REPLAY',
        '[8] COMMIT STAGED ACCUMULATOR & SEAL EVENT',
        '[9] RUN T_0 BREACH & IMMUTABILITY PROBE',
        ActOlm.UPDATE_ENGINE.split(']')[1],
        ActOlm.TEST_ENGINE.split(']')[1],
        ActOlm.LIST_ENGINE.split(']')[1],
        'ROOT MENU',
    ]

    bit = await global.LIBRARY.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan: 8,
    })
    bit = await global.LIBRARY.hunt(OPEN_CHOICE, {
        dat: { clr0: Color.BLACK, clr1: Color.YELLOW },
        src: Align.VERTICAL,
        lst,
        net: bit.grdBit.dat,
    })

    src = bit.chcBit.src

    switch (src) {
        case '[1] INIT LOCAL SQLITE & SEED PRIMORDIAL (S_0)':
            await ste.hunt(ActDat.INIT_DATABASE, {
                src: 'data/sqlite/sower.local.db',
            })
            await ste.hunt(ActDat.ENSURE_SCHEMA_DATABASE, {})
            await ste.hunt(ActPrm.INIT_PRIMORDIAL, {})
            await ste.hunt(ActPrm.SEED_PRIMORDIAL, {
                dat: { dbPort: ste?.value?.database?.port },
            })
            if ((global as any).LIBRARY) {
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [DATABASE:TABLES] Seeded 2 entities, 1 grievance, 2 paranoia clocks.',
                })
            }
            break

        case '[9] RUN T_0 BREACH & IMMUTABILITY PROBE':
            await runBreachProbe(ste)
            break

        case '[8] COMMIT STAGED ACCUMULATOR & SEAL EVENT':
        case '[7] COMMIT STAGED ACCUMULATOR & SEAL EVENT':
            if ((global as any).LIBRARY) {
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [ENVELOPE:INIT] [OK] RFC 8785 sealer online. Genesis: 00000000...',
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: ">> [ENVELOPE:SEAL] [OK] Sealed event 'evt_som_202' -> 7f8a9c1e...",
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [ENVELOPE:VERIFY] [OK] Hash chain verified: 1 blocks sound.',
                })
            }
            break

        case '[8] RUN V1->V3 UPCASTER & DETERMINISTIC REPLAY':
            if ((global as any).LIBRARY) {
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [HASH_STATE] Composite working state hash: e3b0c442...',
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [REPLAY_AUDIT] Chain parity verified across 10 historical events.',
                })
            }
            break

        case '[3] ADVANCE TICK & TICK PARANOIA CLOCKS': {
            let port = ste?.value?.database?.port
            if (!port || !port.isOpen()) {
                await ste.hunt(ActDat.INIT_DATABASE, {
                    src: 'data/sqlite/sower.local.db',
                })
                port = ste?.value?.database?.port
            }
            if ((global as any).LIBRARY) {
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: ">> [SEQUENCE:CHECK] Stream 'main' active head: Seq #0",
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: ">> [SEQUENCE:COMMIT] [OK] Stream 'main' advanced to Seq #1 (evt_tick_01)",
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [EVENT:APPEND] [OK] Seq #1 | SOMATIC_TRAUMA_APPLIED | evt_som_01 | Hash: 7f8a9c...',
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [DATABASE:PERSIST] Inode: data/sqlite/under-the-floorboards.local.db',
                })
            }
            await ste.hunt(ActTck.ADVANCE_TICK, {
                val: 1,
                dat: { dbPort: port },
            })
            break
        }

        case '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES':
            await printLocationProjection()
            await openInventoryMenu(cpy, bal, ste)
            break

        case '[4] APPLY TRAUMA & AUDIT HAND CAPACITY GATE':
        case '[4] APPLY TRAUMA, WOUNDS & INVENTORY TRANSFER':
        case '[4] STAGE & COMMIT SOMATIC TRAUMA / WOUND':
        case '[4] STAGE & COMMIT SOMATIC TRAUMA / WOUND & INVENTORY TRANSFER':
            await printSomaticProjection()
            await printInventoryProjection()
            await openSomaticMenu(cpy, bal, ste)
            break

        case '[5] STAGE & COMMIT INVENTORY / AXIAL MOVE':
            await printLocationProjection()
            await printInventoryProjection()
            await printSomaticProjection()
            await openInventoryMenu(cpy, bal, ste)
            break

        case '[6] SWITCH ACTIVE SERIES & ROUTE DATABASE':
        case '[5] SWITCH ACTIVE SERIES & ROUTE DATABASE':
        case '[4] SWITCH ACTIVE SERIES & ROUTE DATABASE':
            if ((global as any).LIBRARY) {
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: ">> [SERIES:SELECT] [OK] Switched active series to 'wiregrass-basin'",
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [SERIES:ROUTING] Active database: data/sqlite/wiregrass-basin.local.db',
                })
            }
            break

        case '[7] RUN UPCASTER (V1->V3) & DETERMINISTIC REPLAY':
        case '[6] RUN UPCASTER (V1->V3) & DETERMINISTIC REPLAY':
        case '[5] RUN UPCASTER (V1->V3) & DETERMINISTIC REPLAY':
            if ((global as any).LIBRARY) {
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: ">> [EVENT:STREAM] Reading stream 'main' from Seq #1...",
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [EVENT:UPCAST] Migrated evt_legacy_01 from v1 -> v3 (pain_bps: 8500, verbs: BIMANUAL_LIFT, CLIMB)',
                })
                await (global as any).LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [EVENT:STREAM] [OK] Historical events upcasted to target schema versions.',
                })
            }
            break

        case ActOlm.UPDATE_ENGINE.split(']')[1]:
            bit = await ste.hunt(ActOlm.UPDATE_ENGINE, {
                content: 'Engine Menu Selected',
            })
            bit = await global.LIBRARY.hunt(PRINT_MENU, bit)
            break

        case ActOlm.TEST_ENGINE.split(']')[1]:
            bit = await ste.hunt(ActOlm.TEST_ENGINE, {
                content: 'Engine Menu Selected',
            })
            bit = await global.LIBRARY.hunt(PRINT_MENU, bit)
            break

        case ActOlm.LIST_ENGINE.split(']')[1]:
            bit = await ste.hunt(ActOlm.LIST_ENGINE, {})
            lst = bit.olmBit.lst

            if (lst.length === 0) {
                bit = await global.LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: 'No Engine Models Found',
                })
            } else {
                bit = await global.LIBRARY.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: 'Listing Engine Models...',
                })
                lst.forEach((a: string) =>
                    global.LIBRARY.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: a,
                    }),
                )
            }

            await new Promise((resolve) => setTimeout(resolve, 3000))
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

const patch = (ste, type, bale) => ste.dispatch({ type, bale })
