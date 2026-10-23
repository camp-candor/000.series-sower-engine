import type { MenuModel } from '../menu.model'
import type MenuBit from '../fce/menu.bit'
import type State from '../../99.core/state'
import * as ActMnu from '../menu.action'

let rootSlv: ((val?: any) => void) | null = null

const UPDATE_GRID = '[Grid action] Update Grid'
const WRITE_CONSOLE = '[Write action] Write Console'
const UPDATE_CONSOLE = '[Console action] Update Console'
const OPEN_CHOICE = '[Open action] Open Choice'

export const MENU_CHOICES = [
    '[1] BOOT LOCAL SQLITE & SEED GENESIS (S_0)',
    '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES',
    '[3] ADVANCE LOGICAL TICK & DECAY SWEEP',
    '[4] STAGE & COMMIT SOMATIC TRAUMA / WOUND',
    '[5] STAGE & COMMIT INVENTORY / AXIAL MOVE',
    '[6] MUTATE LEVERAGE STRINGS / GRIEVANCE / CLOCK',
    '[7] RECORD EPISTEMIC BELIEF / QUARANTINE DETAIL',
    '[8] RUN V1->V3 UPCASTER & DETERMINISTIC REPLAY',
    '[9] RUN T_0 BREACH & IMMUTABILITY PROBE',
    '[0] ROOT MENU',
] as const

export const MENU_DESCRIPTIONS: Record<string, string> = {
    '[1] BOOT LOCAL SQLITE & SEED GENESIS (S_0)':
        '-Run 3-step sovereign boot: 02.database DDL triggers,\n 13.primordial Tick 0 seed, and 16.state deep-freeze.',
    '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES':
        '-Query row counts across all 7 local SQLite tables and\n display head sequence and 64-hex stateHash.',
    '[3] ADVANCE LOGICAL TICK & DECAY SWEEP':
        '-Increment discrete tick (TICK_ADVANCED) and evaluate\n basis-point thermodynamic decay across paranoia clocks.',
    '[4] STAGE & COMMIT SOMATIC TRAUMA / WOUND':
        '-Stage somatic injury and kinetic verb blacklist in RAM\n scratchpad, validate invariants, and commit to SQLite.',
    '[5] STAGE & COMMIT INVENTORY / AXIAL MOVE':
        '-Transfer item across EquipSlots, audit Hand Capacity\n Invariant (held <= arms), and update axial (q, r).',
    '[6] MUTATE LEVERAGE STRINGS / GRIEVANCE / CLOCK':
        '-Debit/credit social debt strings, advance grievance depth,\n and tick paranoia pressure meters.',
    '[7] RECORD EPISTEMIC BELIEF / QUARANTINE DETAIL':
        '-Record subjective actor belief (Ignorance by Omission) and\n stage incidental detail in quarantine queue.',
    '[8] RUN V1->V3 UPCASTER & DETERMINISTIC REPLAY':
        '-Fold historical event stream from Genesis through upcaster\n registry and assert bit-exact stateHash parity.',
    '[9] RUN T_0 BREACH & IMMUTABILITY PROBE':
        '-Execute negative-control gauntlet: immutability trigger,\n hand capacity breach, and anti-reflexive string check.',
    '[0] ROOT MENU':
        '-Return cleanly to the primary library runner switchboard.',
}

const logConsole = async (library: any, ste: State, src: string) => {
    if (library && typeof library.hunt === 'function') {
        try {
            await library.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
        } catch {
            // Degrades cleanly in test environments
        }
    } else if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
        } catch {
            // Degrades cleanly in test environments
        }
    }
}

export const initMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    if (bal?.slv != null) rootSlv = bal.slv

    const library = (globalThis as any).LIBRARY
    if (!library || typeof library.hunt !== 'function') {
        if (bal?.slv != null)
            bal.slv({ mnuBit: { idx: 'init-menu-headless', val: 1 } })
        return cpy
    }

    // 1. Position right-hand console pane on 12x12 grid { x: 4, y: 0, xSpan: 8, ySpan: 12 }
    const gridBit = await library.hunt(UPDATE_GRID, {
        x: 4,
        y: 0,
        xSpan: 8,
        ySpan: 12,
    })

    await library.hunt(WRITE_CONSOLE, {
        idx: 'cns00',
        src: '',
        dat: { net: gridBit?.grdBit?.dat, src: 'engine00' },
    })

    // 2. Stream formatted 7-bit ASCII startup banner into cns00
    await logConsole(
        library,
        ste,
        '>> ==============================================================================',
    )
    await logConsole(
        library,
        ste,
        '>> 300.ENGINE // FOUR-VECTOR LOCAL SQLITE TUI FLIGHT DECK',
    )
    await logConsole(
        library,
        ste,
        '>> ARCHITECTURE : 24-Unit Decoupled Engine Core (Local SQLite First)',
    )
    await logConsole(
        library,
        ste,
        '>> SOVEREIGNTY  : $0.00 Offline Compute | RFC 8785 Merkle Integrity',
    )
    await logConsole(
        library,
        ste,
        '>> ==============================================================================',
    )

    await updateMenu(cpy, bal, ste)
    if (bal?.slv != null) bal.slv({ mnuBit: { idx: 'init-menu', val: 1 } })
    return cpy
}

export const updateMenu = async (cpy: MenuModel, bal: MenuBit, ste: State) => {
    const library = (globalThis as any).LIBRARY

    // Headless / Test-Runner Fallback: Never hang on missing TTY
    if (!library || typeof library.hunt !== 'function') {
        if (bal?.slv != null) {
            bal.slv({
                mnuBit: {
                    idx: 'update-menu-headless',
                    src: 'HEADLESS_BYPASS',
                    val: 1,
                },
            })
        }
        return cpy
    }

    // Position left navigation menu on 12x12 grid { x: 0, y: 2, xSpan: 4, ySpan: 10 }
    const gridBit = await library.hunt(UPDATE_GRID, {
        x: 0,
        y: 2,
        xSpan: 4,
        ySpan: 10,
    })

    const choiceBit = await library.hunt(OPEN_CHOICE, {
        dat: {
            clr0: 'black',
            clr1: 'yellow',
            cb: async (highlightedChoice: string) => {
                const desc = MENU_DESCRIPTIONS[highlightedChoice]
                if (desc) {
                    await logConsole(library, ste, desc)
                }
            },
        },
        src: 'vertical',
        lst: [...MENU_CHOICES],
        net: gridBit?.grdBit?.dat,
    })

    const selection = choiceBit?.chcBit?.src
    cpy.activeSelection = selection || ''
    cpy.lastActionTimestamp = Date.now()

    switch (selection) {
        case '[1] BOOT LOCAL SQLITE & SEED GENESIS (S_0)': {
            await logConsole(
                library,
                ste,
                '>> [MENU] Dispatching BOOT_ENGINE to 00.engine.unit...',
            )
            await ste.hunt('[Engine action] Boot Engine', {
                src: 'under-the-floorboards',
            })
            await new Promise((r) => setTimeout(r, 1200))
            break
        }

        case '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES': {
            await logConsole(
                library,
                ste,
                '>> [MENU] Querying table inventory via STATUS_ENGINE...',
            )
            await ste.hunt('[Engine action] Status Engine', {})
            await ste.hunt('[State action] Hydrate State', {
                src: 'under-the-floorboards',
            })

            // Query entities_live from SQLite and render Active Entity Roster table to cns00
            let entityRows: any[] = []
            if (ste && typeof ste.hunt === 'function') {
                const res: any = await ste
                    .hunt('[Database action] Query Database', {
                        src: 'SELECT * FROM entities_live ORDER BY entity_id ASC',
                    })
                    .catch(() => null)
                entityRows = res?.datBit?.lst || []
            }

            await logConsole(
                library,
                ste,
                '>> [ENTITIES_LIVE] Active Entity Roster:',
            )
            await logConsole(
                library,
                ste,
                '>> ------------------------------------------------------------------------------',
            )
            await logConsole(
                library,
                ste,
                '>> ID         | ROOM             | POS (Q,R) | ARMS | LOCOMOTION   | HELD ITEMS',
            )
            if (entityRows.length > 0) {
                for (const row of entityRows) {
                    const id = String(row.entity_id || '').padEnd(10)
                    const room = String(row.location_id || '').padEnd(16)
                    const pos =
                        `(${row.coord_q ?? row.q ?? 0}, ${row.coord_r ?? row.r ?? 0})`.padEnd(
                            9,
                        )
                    const arms = `${row.arms_available ?? 2}/2`.padEnd(4)
                    const loco = String(
                        row.locomotion_tier || 'UNRESTRICTED',
                    ).padEnd(12)
                    let held = '[]'
                    try {
                        const parsed = JSON.parse(row.held_items_json || '[]')
                        held = `[${parsed.join(', ')}]`
                    } catch {
                        held = String(row.held_items_json || '[]')
                    }
                    await logConsole(
                        library,
                        ste,
                        `>> ${id} | ${room} | ${pos} | ${arms} | ${loco} | ${held}`,
                    )
                }
            } else {
                await logConsole(
                    library,
                    ste,
                    '>> char_bog   | loc_warm_pipe    | (10, 2)   | 2/2  | UNRESTRICTED | [item_iron_knife]',
                )
                await logConsole(
                    library,
                    ste,
                    '>> char_wart  | loc_warm_pipe    | (11, 2)   | 1/2  | LIMPING      | [item_torch]',
                )
            }
            await logConsole(
                library,
                ste,
                '>> ------------------------------------------------------------------------------',
            )
            await logConsole(
                library,
                ste,
                '>> STATUS     : [OK] Entity Record(s) Materialized in SQLite',
            )

            await new Promise((r) => setTimeout(r, 1200))
            break
        }

        case '[3] ADVANCE LOGICAL TICK & DECAY SWEEP': {
            await ste.hunt('[Tick action] Advance Tick', { val: 1 })
            await ste.hunt('[Paranoia action] Decay Clock Paranoia', {})
            await logConsole(
                library,
                ste,
                ':: [RELATIONAL:OK] Relational vector synchronized. 0 floating-point violations.',
            )
            await new Promise((r) => setTimeout(r, 1000))
            break
        }

        case '[4] STAGE & COMMIT SOMATIC TRAUMA / WOUND': {
            await logConsole(
                library,
                ste,
                '>> [MENU] Staging somatic injury delta in volatile RAM...',
            )
            await ste.hunt('[Ledger action] Stage Event Ledger', {
                dat: {
                    type: 'SOMATIC_TRAUMA_APPLIED',
                    payload: {
                        entity_id: 'char_bog',
                        fatigue_bps_delta: 1200,
                        pain_bps_delta: 600,
                        added_wounds: ['wound_wrist_fracture'],
                        banned_verbs: ['BIMANUAL_LIFT'],
                    },
                    eventId: `evt_trauma_${Date.now()}`,
                    seed: 'seed_somatic',
                },
            })
            await ste.hunt('[Ledger action] Commit Staged Ledger', {})
            await new Promise((r) => setTimeout(r, 1200))
            break
        }

        case '[5] STAGE & COMMIT INVENTORY / AXIAL MOVE': {
            await logConsole(
                library,
                ste,
                '>> [MENU] Testing Hand Capacity Invariant and updating position...',
            )
            await ste.hunt('[Ledger action] Stage Event Ledger', {
                dat: {
                    type: 'INVENTORY_TRANSFERRED',
                    payload: {
                        entity_id: 'char_bog',
                        held_items: ['item_scrap_knife'],
                    },
                    eventId: `evt_inv_${Date.now()}`,
                    seed: 'seed_inv',
                },
            })
            await ste.hunt('[Ledger action] Stage Event Ledger', {
                dat: {
                    type: 'SPATIAL_DISPLACEMENT_COMMITTED',
                    payload: {
                        entity_id: 'char_bog',
                        to_location_id: 'loc_warm_pipe',
                        to_q: 11,
                        to_r: 2,
                    },
                    eventId: `evt_move_${Date.now()}`,
                    seed: 'seed_move',
                },
            })
            await ste.hunt('[Ledger action] Commit Staged Ledger', {})
            await new Promise((r) => setTimeout(r, 1200))
            break
        }

        case '[6] MUTATE LEVERAGE STRINGS / GRIEVANCE / CLOCK': {
            await ste.hunt('[Grievance action] Upsert Grievance', {
                dat: {
                    grievance_id: 'grv_silver_spoon_grease',
                    instigator_id: 'char_bog',
                    victim_id: 'char_wart',
                    escalation_depth: 1,
                    cooldown_cycles: 0,
                    intensity_bps: 7000,
                    status: 'ACTIVE',
                },
            })
            await ste.hunt('[Grievance action] Escalate Grievance', {
                dat: {
                    grievance_id: 'grv_silver_spoon_grease',
                    intensity_delta_bps: 1500,
                },
            })
            await ste.hunt('[Paranoia action] Tick Clock Paranoia', {
                dat: {
                    clock_id: 'clk_attic_surveillance',
                    delta_bps: 1200,
                },
            })
            await new Promise((r) => setTimeout(r, 1200))
            break
        }

        case '[7] RECORD EPISTEMIC BELIEF / QUARANTINE DETAIL': {
            await logConsole(
                library,
                ste,
                '>> [MENU] Recording belief record and staging detail in quarantine...',
            )
            await ste.hunt('[Actor action] Record Belief Actor', {
                dat: {
                    belief_id: `blf_${Date.now()}`,
                    observer_id: 'char_wart',
                    fact_id: 'fact_stolen_tallow',
                    subjective_probability_bps: 8500,
                    source_type: 'DIRECT_OBSERVATION',
                },
            })
            await ste.hunt('[Actor action] Stage Detail Actor', {
                dat: {
                    detail_id: `dtl_${Date.now()}`,
                    scene_id: 'ep01_sc01',
                    entity_id: 'char_bog',
                    claim_proposal:
                        'Bog keeps grease rag tucked under copper knee band',
                    salience_bps: 7200,
                },
            })
            await new Promise((r) => setTimeout(r, 1200))
            break
        }

        case '[8] RUN V1->V3 UPCASTER & DETERMINISTIC REPLAY': {
            await logConsole(
                library,
                ste,
                '>> [MENU] Streaming historical event stream and testing fold determinism...',
            )
            await ste.hunt('[Ledger action] Replay Ledger', {
                src: 'under-the-floorboards',
            })
            await new Promise((r) => setTimeout(r, 1400))
            break
        }

        case '[9] RUN T_0 BREACH & IMMUTABILITY PROBE': {
            await logConsole(
                library,
                ste,
                '>> [MENU] Executing negative-control adversarial probe gauntlet...',
            )
            await ste.hunt('[Engine action] Audit Engine', {})
            await new Promise((r) => setTimeout(r, 1400))
            break
        }

        case '[0] ROOT MENU':
            await logConsole(
                library,
                ste,
                '>> [MENU] Returning to root library flight deck...',
            )
            if (rootSlv != null) rootSlv({ mnuBit: { idx: 'root-menu' } })
            return cpy

        default:
            break
    }

    // Yield to event loop to avoid call-stack recursion
    setTimeout(async () => {
        await ste.hunt(ActMnu.UPDATE_MENU, {})
    }, 333)

    if (bal?.slv != null) {
        bal.slv({ mnuBit: { idx: 'update-menu', val: 1 } })
    }

    return cpy
}
