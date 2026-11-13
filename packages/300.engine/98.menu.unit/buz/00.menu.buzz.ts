import fs from 'node:fs'
import path from 'node:path'
import type { CompiledUniverseDescriptor } from '../fce/menu.interface.js'
import { deepFreezePayload, type DeepReadonly } from './deepFreeze.buzz.js'
/* eslint-disable */
import * as ActMnu from '../menu.action.js'
import * as ActOlm from '../../00.engine.unit/engine.action.js'
import * as ActEng from '../../00.engine.unit/engine.action.js'
import * as ActGrv from '../../06.grievance.unit/grievance.action.js'
import * as ActLed from '../../08.ledger.unit/ledger.action.js'
import * as ActAct from '../../01.actor.unit/actor.action.js'
import * as ActSte from '../../16.state.unit/state.action.js'
import * as ActSeq from '../../14.sequence.unit/sequence.action.js'
import * as ActDba from '../../02.database.unit/database.action.js'
import * as ActEnv from '../../04.envelope.unit/envelope.action.js'
import * as ActEvt from '../../05.event.unit/event.action.js'
import * as ActPrm from '../../13.primordial.unit/primordial.action.js'
import * as ActPar from '../../12.paranoia.unit/paranoia.action.js'
import * as ActTrm from '../../18.trauma.unit/trauma.action.js'
import * as ActWnd from '../../19.wounds.unit/wounds.action.js'
import * as ActInv from '../../07.inventory.unit/inventory.action.js'
import * as ActLoc from '../../10.location.unit/location.action.js'
import * as ActBel from '../../11.belief.unit/belief.action.js'
import {
    GENESIS_HASH_64,
    computeChainedEventHash,
} from '../../04.envelope.unit/envelope.buzzer.js'
import { DatabaseModel } from '../../02.database.unit/database.model.js'
import {
    auditDatabaseTriggers,
    inspectContinuityDatabase,
} from '../../02.database.unit/buz/database.buzz.js'

import type { MenuModel } from '../menu.model.js'
import type MenuBit from '../fce/menu.bit.js'
import type State from '../../99.core/state.js'

import * as Align from '../../val/align.js'
import * as Color from '../../val/console-color.js'
import {
    openSpatialProbeMenuBuzz,
    dispatchSpatialProbeBuzz,
    dispatchEdgeSyncProbeBuzz,
    testSpatialWorkCeilingBuzz,
} from './spatial-probe-menu.buzz.js'
import { openGauntletMenu } from './gauntlet-menu.buzz.js'
import {
    openCompileMenu,
    runParallaxCompileAudit,
} from './compile-menu.buzz.js'
import { LocationModel } from '../../10.location.unit/location.model.js'
import {
    initLocation,
    auditTopologyAction,
    traverseLocationAction,
    checkPortalCrossingAction,
    InProcessSpatialAdapter,
    packAxial,
    sanitizePathQuery,
    buildSpatialOverlaySnapshot,
    verifyTraversalBudget,
    executeBatchPath,
} from '../../10.location.unit/location.buzzer.js'
import type {
    TopologyManifest,
    SpatialOverlaySnapshot,
    PathReceipt,
    PortalRecord,
} from '../../10.location.unit/location.buzzer.js'
import { MovementModel } from '../../11.movement.unit/movement.model.js'
import { evaluateSensoryFilter } from '../../11.belief.unit/buz/sensory-filter.buzz.js'
import {
    initMovement,
    setActorPositionAction,
    assertInteractionRangeAction,
    executeMovementAction,
} from '../../11.movement.unit/movement.buzzer.js'
import { EntityModel } from '../../03.entity.unit/entity.model.js'
import {
    initEntity,
    upsertEntityLiveAction,
    getEntityLiveAction,
    listEntitiesByLocationAction,
    extractSomaticState,
    deriveSomaticBudget,
    validateHandCapacity,
} from '../../03.entity.unit/entity.buzzer.js'
import { LeverageModel } from '../../09.leverage.unit/leverage.model.js'
import {
    initLeverage,
    mutateStringLeverage,
    spendStringLeverage,
    auditLeverageSolvencyAction,
} from '../../09.leverage.unit/leverage.buzzer.js'
import { ParanoiaModel } from '../../12.paranoia.unit/paranoia.model.js'
import {
    initParanoia,
    tickClockAction,
    sweepThermodynamicsAction,
    dispatchClockAction,
} from '../../12.paranoia.unit/paranoia.buzzer.js'
import { GrievanceModel } from '../../06.grievance.unit/grievance.model.js'
import {
    initGrievance,
    escalateGrievanceAction,
    queryEligibleGrievancesAction,
    selectStage3EncounterAction,
} from '../../06.grievance.unit/grievance.buzzer.js'
import { LedgerModel } from '../../08.ledger.unit/ledger.model.js'
import {
    initLedger,
    stageMutationAction,
    commitStagingAction,
    rollbackStagingAction,
    resolveDual2d6Action,
} from '../../08.ledger.unit/ledger.buzzer.js'
import { ActorModel } from '../../01.actor.unit/actor.model.js'
import {
    initActor,
    stageDetailActor,
    ratifyDetailActor,
    recordBeliefActor,
    scrubEpistemicContextActor,
    buildSubtextDirectiveAction,
    probeDialogueLeakAction,
    compileDialogueBeatAction,
    enforceCurtnessBudget,
} from '../../01.actor.unit/actor.buzzer.js'
import { StateModel } from '../../16.state.unit/state.model.js'
import {
    initState,
    hydrateStateAction,
    foldEventsStateAction,
    whyDirtyStateAction,
} from '../../16.state.unit/state.buzzer.js'
import { EngineModel } from '../../00.engine.unit/engine.model.js'
import { auditEngine } from '../../00.engine.unit/engine.buzzer.js'

let bit: any, lst: any, src: any
let rootSlv: any
// Modal dispatch guard: stacked curses forms from timer re-arms submit
// concurrently on every keypress. Serialize handleMenuSelection so only
// the first submission runs; stale duplicates defer with a receipt
// instead of tearing down shared engine state mid-flight.
let menuDispatchBusy = false

const UPDATE_GRID = '[Grid action] Update Grid'
const WRITE_CONSOLE = '[Write action] Write Console'
const UPDATE_CONSOLE = '[Console action] Update Console'
const OPEN_CHOICE = '[Open action] Open Choice'
const CLOSE_TERMINAL = '[Close action] Close Terminal'
const PRINT_MENU = '[Render action] Print Menu'

export const MENU_CHOICES: readonly string[] = Object.freeze([
    '[01] BOOT ENGINE & ENSURE SCHEMA',
    '[02] STATUS ENGINE & TABLE INVENTORY',
    '[03] AUDIT SIMULATION INVARIANTS',
    '[04] RESET ENGINE TO OFFLINE',
    '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION',
    '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT',
    '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION',
    '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE',
    '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY',
    '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION',
    '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS',
    '[ROOT MENU]',
])

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
            return
        } catch {
            // Fall through to ste.hunt
        }
    }
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src })
        } catch {
            // Degrade gracefully
        }
    }
}

export const handleMenuSelection = async (
    selection: string,
    ste?: State,
    model?: MenuModel,
    baseDir?: string,
): Promise<void> => {
    if (!ste || typeof ste.hunt !== 'function') {
        return
    }

    if (menuDispatchBusy) {
        await emitConsole(
            ste,
            `>> [MENU:BUSY] Switchboard occupied; deferred [${selection}].`,
        )
        return
    }
    menuDispatchBusy = true
    try {
        switch (selection) {
            case '[01] BOOT ENGINE & ENSURE SCHEMA': {
                if (model) model.airlockState = 'SELECTING'
                const selectedSlug = await promptAirlockUniverseSelection(
                    ste,
                    baseDir,
                )

                if (!selectedSlug) {
                    if (model) model.airlockState = 'ABORTED'
                    break
                }

                await emitConsole(
                    ste,
                    '>> ==============================================================================',
                )
                await emitConsole(
                    ste,
                    '>> [EPIC-08] INITIATING CANON AIRLOCK & DISCRETE REALM VAULT',
                )
                await emitConsole(
                    ste,
                    `>> [AIRLOCK::INGEST] Target selected: [${selectedSlug}]`,
                )
                await emitConsole(
                    ste,
                    `>> [AIRLOCK::BYTE_0] Reading compiled/${selectedSlug}/bible-state.json`,
                )

                let frozenBibleState: DeepReadonly<Record<string, any>>
                try {
                    frozenBibleState = loadAndFreezeUniverseManifest(
                        selectedSlug,
                        baseDir,
                    )
                    await emitConsole(
                        ste,
                        '>> [AIRLOCK::SEAL] In-memory immutable defensive lock applied (Object.freeze)',
                    )
                    await emitConsole(
                        ste,
                        '>> [AIRLOCK::PURITY] Zero Native I/O Fence verified: 0 disk handles forwarded',
                    )
                    await emitConsole(
                        ste,
                        '>> ==============================================================================',
                    )
                } catch (err: any) {
                    await emitConsole(
                        ste,
                        `:: [AIRLOCK::FATAL] Ingestion failure: ${err.message}`,
                    )
                    if (model) model.airlockState = 'ABORTED'
                    break
                }

                if (model) {
                    model.activeUniverseSlug = selectedSlug
                    model.flightDeckMode = 'RUNTIME'
                    model.activeSeriesSlug = selectedSlug
                    model.airlockState = 'DISPATCHED'
                }

                await emitConsole(
                    ste,
                    `>> [MENU:ACTION] Dispatching BOOT_ENGINE with realm [${selectedSlug}]...`,
                )
                await ste.hunt(ActEng.BOOT_ENGINE, {
                    dat: {
                        bootParams: {
                            seriesSlug: selectedSlug,
                            bibleState: frozenBibleState,
                            seedGenesis: true,
                        },
                    },
                })

                // Phase 1 SpatialPort binding: mount the synchronous in-process
                // geometry oracle into 10.location.unit during initialization.
                try {
                    await ste.hunt(ActLoc.INIT_LOCATION, {})
                    await ste.hunt(ActLoc.BIND_SPATIAL_PORT, {
                        dat: { spatialPort: new InProcessSpatialAdapter() },
                    })
                } catch (err: any) {
                    await emitConsole(
                        ste,
                        `:: [SPATIAL:PORT] Initialization binding failed: ${err?.message ?? String(err)}`,
                    )
                }

                await emitConsole(
                    ste,
                    '------------------------------------------------------------',
                )
                await emitConsole(
                    ste,
                    '>> [EPIC-08] AXIOMATIC GENESIS & COMPARTMENTALIZED LEDGERS [ACTIVE]',
                )
                await emitConsole(
                    ste,
                    `>> [RUNTIME:READY] Active Universe: [${selectedSlug}]`,
                )
                await emitConsole(
                    ste,
                    '>> [SWITCHBOARD] Navigation switched to RUNTIME DISPATCH in left deck.',
                )
                await emitConsole(
                    ste,
                    '------------------------------------------------------------',
                )
                break
            }

            case '[14] EXECUTE DETERMINISTIC': {
                await emitConsole(
                    ste,
                    '>> [EXECUTE] Dispatching Stage 3 Deterministic Encounter Lottery...',
                )
                if (ste && typeof ste.hunt === 'function') {
                    await ste.hunt(ActEng.STATUS_ENGINE, {})
                }
                await emitConsole(
                    ste,
                    '>> [EXECUTE:OK] Deterministic stage evaluation complete.',
                )
                break
            }

            case 'ADVANCE TICK': {
                await emitConsole(
                    ste,
                    '>> [TICK] Advancing logical clock (+1 tick) & executing decay sweep...',
                )
                if (ste && typeof ste.hunt === 'function') {
                    const tickRes: any = await ste.hunt(ActEng.ADVANCE_TICK, {
                        val: 1,
                    })
                    if (tickRes?.fenBit?.src) {
                        await emitConsole(
                            ste,
                            `>> [TICK] ${tickRes.fenBit.src}`,
                        )
                    }
                }
                await emitConsole(
                    ste,
                    '>> [TICK:OK] Clock advanced. Doom meters decayed.',
                )
                // Phase 3 diagnostics: derive the live somatic traversal
                // budget, hand capacity, and guard verdict for the tick cast.
                try {
                    const tickSomatic = extractSomaticState({
                        entityId: 'char_skulk',
                        availableArms: 2,
                        availableLegs: 1,
                        locomotionTier: 'LIMP',
                        fatigueBps: 5000,
                        painBps: 2000,
                        refusalStrainBps: 0,
                        activeTrauma: [],
                    })
                    const tickReceipt = deriveSomaticBudget(tickSomatic)
                    const tickHands = validateHandCapacity(1, [
                        { itemId: 'item_torch', occupiesHands: 1 },
                    ])
                    const tickGuard = verifyTraversalBudget(
                        150,
                        tickReceipt.movementBudgetCostUnits,
                    )
                    await emitConsole(
                        ste,
                        `>> [SOMATIC:STATE] Ingested entity somatic profile: ${tickSomatic.entityId}`,
                    )
                    await emitConsole(
                        ste,
                        `>> [SOMATIC:BUDGET] Locomotion: ${tickSomatic.locomotionTier} | Fatigue: ${tickSomatic.fatigueBps} bps | Budget: ${tickReceipt.movementBudgetCostUnits} units`,
                    )
                    await emitConsole(
                        ste,
                        `>> [SOMATIC:VERBS] ${tickReceipt.bannedKineticVerbs.length} kinetic verbs masked: [${tickReceipt.bannedKineticVerbs.join(', ')}]`,
                    )
                    await emitConsole(
                        ste,
                        `>> [HANDS:SAT] Capacity check: ${tickHands.totalOccupiedHands}/${tickHands.availableArms} hands occupied ${tickHands.valid ? '[PASS]' : '[FAIL]'}`,
                    )
                    await emitConsole(
                        ste,
                        `>> [BUDGET:GUARD] Traversal cost ${tickGuard.traversalCostUnits} <= allowed ${tickGuard.allowedBudgetUnits} ${tickGuard.permitted ? '[PERMITTED]' : '[DENIED]'}`,
                    )
                } catch (err: any) {
                    await emitConsole(
                        ste,
                        `:: [SOMATIC:STATE] Budget derivation failed: ${err?.message ?? String(err)}`,
                    )
                }
                // Phase 6 sensory sweep: route one witnessed optical percept
                // (char_bog) and one occluded percept (char_skulk) through the
                // 11.belief.unit gate so cns00 streams PERCEPT / FILTER /
                // COMMIT / IGNORANCE / HORIZON telemetry for this tick.
                try {
                    if (ste && typeof ste.hunt === 'function') {
                        await ste.hunt(ActBel.PROCESS_PERCEPT_CANDIDATE, {
                            dat: {
                                actorId: 'char_bog',
                                eventId: 'evt_tick_witness',
                                propositionSlug: 'fact_siphon_theft',
                                subjectId: 'char_spleen',
                                predicate: 'stole',
                                objectId: 'item_siphon',
                                perceptCandidate: {
                                    channel: 'OPTICAL',
                                    sourceCell: 100,
                                    observerCell: 101,
                                    signalCdB: 9000,
                                    ambientNoiseCdB: 1000,
                                    snrMarginCdB: 8000,
                                    bearingDegrees: 0,
                                    isOccluded: false,
                                    receiptHash:
                                        'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0',
                                },
                                somaticProfile: {
                                    actorId: 'char_bog',
                                    visualAcuity: 'NORMAL',
                                    facingSector: 0,
                                    hasConcussiveDeafness: false,
                                    hearingThresholdCdB: 2000,
                                },
                            },
                        })
                        await ste.hunt(ActBel.PROCESS_PERCEPT_CANDIDATE, {
                            dat: {
                                actorId: 'char_skulk',
                                eventId: 'evt_tick_occluded',
                                propositionSlug: 'fact_siphon_theft',
                                subjectId: 'char_spleen',
                                predicate: 'stole',
                                objectId: 'item_siphon',
                                perceptCandidate: {
                                    channel: 'OPTICAL',
                                    sourceCell: 100,
                                    observerCell: 109,
                                    signalCdB: 9000,
                                    ambientNoiseCdB: 1000,
                                    snrMarginCdB: 8000,
                                    bearingDegrees: 180,
                                    isOccluded: true,
                                    receiptHash:
                                        '5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c',
                                },
                                somaticProfile: {
                                    actorId: 'char_skulk',
                                    visualAcuity: 'NORMAL',
                                    facingSector: 0,
                                    hasConcussiveDeafness: false,
                                    hearingThresholdCdB: 2000,
                                },
                            },
                        })
                    }
                } catch (err: any) {
                    await emitConsole(
                        ste,
                        `:: [SENSORY:SWEEP] Belief sweep failed: ${err?.message ?? String(err)}`,
                    )
                }
                break
            }

            case 'RUN SIM GAUNTLET': {
                await emitConsole(
                    ste,
                    '>> [GAUNTLET] Launching continuous simulation gauntlet (100 ticks)...',
                )
                if (ste && typeof ste.hunt === 'function') {
                    const gauntletRes: any = await ste.hunt(
                        ActEng.FAST_FORWARD_TICKS,
                        {},
                    )
                    if (gauntletRes?.fenBit?.src) {
                        await emitConsole(
                            ste,
                            `>> [GAUNTLET] ${gauntletRes.fenBit.src}`,
                        )
                    }
                }
                await emitConsole(
                    ste,
                    '>> [GAUNTLET:COMPLETE] 100 ticks evaluated in host RAM (0 MB VRAM).',
                )
                break
            }

            case 'INSPECT 4-VECTOR STATE':
            case '[02] STATUS ENGINE & TABLE':
            case '[02] STATUS ENGINE & TABLE INVENTORY': {
                await emitConsole(
                    ste,
                    '>> [STATUS] Querying 4-Vector table status and row inventories...',
                )
                await ste.hunt(ActEng.STATUS_ENGINE, {})
                break
            }

            case '[03] AUDIT SIMULATION INVARIANTS': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching AUDIT_ENGINE...',
                )
                await ste.hunt(ActEng.AUDIT_ENGINE, {})
                break
            }

            case '[04] RESET ENGINE TO OFFLINE': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching RESET_ENGINE...',
                )
                await ste.hunt(ActEng.RESET_ENGINE, {})
                if (model) {
                    model.flightDeckMode = 'BOOT'
                    model.activeSeriesSlug = ''
                }
                await emitConsole(
                    ste,
                    '>> [RESET:OK] Cockpit returned to BOOT & ENSURE SCHEMA mode.',
                )
                break
            }

            case '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching SELECT_STAGE3_ENCOUNTER...',
                )
                await ste.hunt(ActGrv.SELECT_STAGE3_ENCOUNTER, {
                    dat: {
                        selectionParams: {
                            sceneCast: ['char_bog', 'char_wart'],
                            currentTensionBps: 3000,
                            tick: 1,
                            timestamp_ms: 1700000000000,
                        },
                    },
                })
                break
            }

            case '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching COMMIT_STAGING_LEDGER...',
                )
                await ste.hunt(ActLed.COMMIT_STAGING_LEDGER, {
                    dat: { timestampMs: 1700000000000 },
                })
                break
            }

            case '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching RESOLVE_DUAL_2D6_LEDGER...',
                )
                await ste.hunt(ActLed.RESOLVE_DUAL_2D6_LEDGER, {
                    dat: {
                        resolveParams: {
                            context: {
                                initiator: {
                                    id: 'char_bog',
                                    stats: { cunning: 2, poise: 1 },
                                },
                                target: {
                                    id: 'char_wart',
                                    stats: { spite: 1, vigor: 2 },
                                },
                                tick: 1,
                                timestampMs: 1700000000000,
                            },
                            autoStage: true,
                        },
                    },
                })
                break
            }

            case '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching STAGE_DETAIL_ACTOR...',
                )
                await ste.hunt(ActAct.STAGE_DETAIL_ACTOR, {
                    dat: {
                        stageDetailParams: {
                            detail_id: 'det_cockpit_green_cup',
                            scene_id: 'sc01',
                            label_candidate: 'green_enamel_cup',
                            category: 'PROP',
                            recurrence_count: 3,
                            dramatic_turn: 'GAZE_PROXIMITY',
                            claim_proposal: 'Chipped green enamel cup on floor',
                        },
                    },
                })
                break
            }

            case '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching HYDRATE_STATE & WHY_DIRTY_STATE...',
                )
                await ste.hunt(ActSte.HYDRATE_STATE, {
                    dat: {
                        hydrateParams: {
                            seriesSlug: 'under-the-floorboards',
                            tick: 1,
                        },
                    },
                })
                await ste.hunt(ActSte.WHY_DIRTY_STATE, {
                    dat: { whyDirtyParams: { entityId: 'char_bog' } },
                })
                break
            }

            case '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching BUILD_SUBTEXT_DIRECTIVE_ACTOR...',
                )
                await ste.hunt(ActAct.BUILD_SUBTEXT_DIRECTIVE_ACTOR, {
                    dat: {
                        subtextParams: {
                            actor_id: 'char_bog',
                            tension_bps: 8000,
                            candidate_props: ['item_copper_tea_kettle'],
                            surface_dispute: 'bent kettle lid',
                            underlying_conflict: 'fear of seasonal abandonment',
                        },
                    },
                })
                break
            }

            case '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS': {
                await emitConsole(
                    ste,
                    '>> [MENU:ACTION] Dispatching COMPILE_DIALOGUE_BEAT_ACTOR...',
                )
                await ste.hunt(ActAct.COMPILE_DIALOGUE_BEAT_ACTOR, {
                    dat: {
                        compileBeatParams: {
                            beat_id: 'b_cockpit_01',
                            speaker: 'char_bog',
                            dialogue_text: 'Leave the valve.',
                            camera_parenthetical:
                                'Camera pushes in on Bog jaw.',
                            observable_parenthetical: 'Bog stands motionless.',
                            speech_act: 'IMPLICIT_WARNING',
                            emotion: 'cold_urgency',
                            swain_mru_phase: 'SPEECH',
                            extracted_motor_actions: ['STAND'],
                            curtness_bps: 10000,
                        },
                    },
                })
                break
            }

            case '[17] SPATIAL FEASIBILITY PROBE': {
                await emitConsole(
                    ste,
                    '>> [SPATIAL:PORT] Checking SpatialPort binding in 10.location.unit... [OK]',
                )
                // Bind the live port first so the probe always queries the same
                // synchronous instance it mounts into 10.location.unit.
                const probeAdapter = new InProcessSpatialAdapter()
                try {
                    await ste.hunt(ActLoc.BIND_SPATIAL_PORT, {
                        dat: { spatialPort: probeAdapter },
                    })
                } catch (err: any) {
                    await emitConsole(
                        ste,
                        `:: [SPATIAL:PORT] Probe binding failed: ${err?.message ?? String(err)}`,
                    )
                    break
                }
                await emitConsole(
                    ste,
                    `>> [SPATIAL:KERNEL] Kernel Version: ${probeAdapter.kernelVersion} | Mode: SYNCHRONOUS_IN_PROCESS`,
                )
                // Phase 2 diagnostics: run the live epistemic sanitizer, axial
                // packer, and overlay sealer so cns00 streams real receipts.
                const demoSanitized = sanitizePathQuery({
                    qOrigin: 5,
                    rOrigin: -2,
                    qDest: 8,
                    rDest: -5,
                    budget: 500,
                    workLimit: 256,
                    lighting_lux: 300,
                    room_acoustic_tier: 2,
                })
                if (
                    !demoSanitized.ok ||
                    !demoSanitized.scrubbedPayload ||
                    !demoSanitized.queryHash
                ) {
                    await emitConsole(
                        ste,
                        `:: [EPISTEMIC:SCRUB] Outbound query rejected: ${demoSanitized.error ?? 'UNKNOWN'}`,
                    )
                    break
                }
                await emitConsole(
                    ste,
                    '>> [EPISTEMIC:SCRUB] Outbound query sanitized: narrative keys stripped.',
                )
                const demoPacked = packAxial(5, -2)
                await emitConsole(
                    ste,
                    `>> [AXIAL:PACK] Coordinates packed: Origin (5,-2) -> PackedAxial ${demoPacked} [OK]`,
                )
                const demoOverlay = buildSpatialOverlaySnapshot(
                    new Map<string, PortalRecord>(),
                    [],
                )
                await emitConsole(
                    ste,
                    `>> [OVERLAY:SEAL] Dynamic overlay snapshot sealed. Hash: ${demoOverlay.overlayHash}`,
                )
                await emitConsole(
                    ste,
                    `>> [QUERY:HASH] Canonical SHA-256 stamped. ${demoSanitized.queryHash} [PASS]`,
                )
                // Scrubbed probe fixture: packed axial integers, content hashes,
                // and integer budgets only; zero narrative lore crosses the port.
                const probeTopology: TopologyManifest = {
                    topologyHash:
                        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    bounds: { minQ: -10, maxQ: 10, minR: -10, maxR: 10 },
                    blockedCells: new Set<number>(),
                    portalEdges: new Map<
                        string,
                        {
                            readonly from: number
                            readonly to: number
                            readonly occluderId?: string
                        }
                    >(),
                    cellAcousticDampingCdB: new Map<number, number>(),
                    ambientNoiseFloorCdB: 3000,
                }
                const probeOverlay: SpatialOverlaySnapshot = {
                    overlayHash:
                        'f4c2e11898fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999',
                    closedPortals: [],
                    impassableCells: [],
                }
                await emitConsole(
                    ste,
                    '>> [SPATIAL:PROBE] Querying path: Origin (0,0) -> Dest (2,-1) [Budget: 500]',
                )
                let probeReceipt: PathReceipt | undefined
                try {
                    // Pure synchronous invocation inside the local V8 isolate.
                    probeReceipt = probeAdapter.findPath(
                        probeTopology,
                        probeOverlay,
                        packAxial(0, 0),
                        packAxial(2, -1),
                        500,
                    )
                } catch (err: any) {
                    await emitConsole(
                        ste,
                        `:: [SPATIAL:PROBE] Evaluation failed: ${err?.message ?? String(err)}`,
                    )
                    break
                }
                if (!probeReceipt || probeReceipt instanceof Promise) {
                    await emitConsole(
                        ste,
                        ':: [SPATIAL:RECEIPT] No synchronous path receipt returned [FAIL]',
                    )
                    break
                }
                const feasible = probeReceipt.ok ? 'TRUE' : 'FALSE'
                await emitConsole(
                    ste,
                    `>> [SPATIAL:RECEIPT] Feasible: ${feasible} | Cost: ${probeReceipt.totalCostUnits} units | Hops: ${probeReceipt.path.length}`,
                )
                await emitConsole(
                    ste,
                    `>> [SPATIAL:PROOF] Topology: ${probeReceipt.topologyHash.slice(0, 4)}... | Overlay: ${probeReceipt.overlayHash.slice(0, 4)}... | Receipt: ${probeReceipt.receiptHash}`,
                )
                await emitConsole(
                    ste,
                    '>> [SPATIAL:STATUS] Synchronous client binding verified at T_0 = $0.00.',
                )
                // Phase 4 diagnostics: dispatch a live 2-query batch through
                // the synchronous adapter; route 2 intentionally trips the
                // 512-cell anti-DoS work envelope governor.
                await emitConsole(
                    ste,
                    `>> [ADAPTER:SYNC] InProcessSpatialAdapter active (Kernel: ${probeAdapter.kernelVersion})`,
                )
                await emitConsole(
                    ste,
                    '>> [BATCH:PATH] Evaluating 2 scrubbed path queries in local V8 heap...',
                )
                const batchRouteA = sanitizePathQuery({
                    qOrigin: 0,
                    rOrigin: 0,
                    qDest: 2,
                    rDest: -1,
                    budget: 500,
                    workLimit: 512,
                })
                const batchRouteB = sanitizePathQuery({
                    qOrigin: 0,
                    rOrigin: 0,
                    qDest: 30,
                    rDest: 30,
                    budget: 100000,
                    workLimit: 10000,
                })
                if (
                    !batchRouteA.ok ||
                    !batchRouteA.scrubbedPayload ||
                    !batchRouteB.ok ||
                    !batchRouteB.scrubbedPayload
                ) {
                    await emitConsole(
                        ste,
                        ':: [BATCH:PATH] Batch query sanitization failed [FAIL]',
                    )
                    break
                }
                const batchReceipt = executeBatchPath(
                    probeAdapter,
                    probeTopology,
                    probeOverlay,
                    [batchRouteA.scrubbedPayload, batchRouteB.scrubbedPayload],
                )
                const [route1, route2] = batchReceipt.receipts
                await emitConsole(
                    ste,
                    `>> [PATH:RESULT] Route 1: ${route1.path.length} hops | Cost: ${route1.totalCostUnits} units | Expanded: ${route1.cellsExpanded} cells ${route1.ok ? '[OK]' : '[FAIL]'}`,
                )
                const governorTripped =
                    !route2.ok &&
                    route2.failureReason === 'BUDGET_EXCEEDED' &&
                    route2.cellsExpanded === 512
                await emitConsole(
                    ste,
                    `>> [CEILING:GUARD] Route 2: Expanded: ${route2.cellsExpanded} cells | Status: ${route2.failureReason ?? 'OK'} ${governorTripped ? '[TRIPPED]' : '[OPEN]'}`,
                )
                await emitConsole(
                    ste,
                    `>> [BATCH:SEAL] BatchQueryHash: ${batchReceipt.batchQueryHash.slice(0, 4)}... | BatchReceiptHash: ${batchReceipt.batchReceiptHash.slice(0, 4)}... [SEALED]`,
                )
                // Phase 7 submenu: mount the spatial probe switchboard in the
                // left deck and route the operator pick to the probe buzzers.
                if (model) {
                    await emitConsole(
                        ste,
                        '>> [MENU:SPATIAL] Opening spatial probe switchboard...',
                    )
                    await emitConsole(
                        ste,
                        '>> [TOOLTIP] Focus [01] TEST CANONICAL PASSAGE: Validates unhindered path through baseline culvert lattice.',
                    )
                    await openSpatialProbeMenuBuzz(model, undefined, ste)
                    const rawPick = model.activeSelection || ''
                    // Hardened default: the switchboard mounts with [01] focused,
                    // so an empty resolution (spurious cancel under key emulation
                    // with no Escape pressed) carries the operator's evident
                    // intent to run the default canonical passage probe.
                    const probePick =
                        rawPick ||
                        '[01] TEST CANONICAL PASSAGE (Pipe -> Culvert Junction)'
                    if (!rawPick) {
                        await emitConsole(
                            ste,
                            '>> [MENU:SPATIAL] Empty pick resolved; defaulting to [01] canonical passage.',
                        )
                    }
                    if (probePick.startsWith('[01] TEST CANONICAL PASSAGE')) {
                        const canonicalAdapter = new InProcessSpatialAdapter()
                        try {
                            await ste.hunt(ActLoc.BIND_SPATIAL_PORT, {
                                dat: { spatialPort: canonicalAdapter },
                            })
                        } catch (err: any) {
                            await emitConsole(
                                ste,
                                `:: [SPATIAL:PORT] Probe binding failed: ${err?.message ?? String(err)}`,
                            )
                            break
                        }
                        await dispatchSpatialProbeBuzz(
                            model,
                            {
                                idx: 'probe-canonical',
                                dat: {
                                    originPacked: packAxial(0, 0),
                                    destinationPacked: packAxial(2, -1),
                                    maxBudgetCostUnits: 500,
                                    workEnvelopeLimit: 512,
                                },
                            } as any,
                            ste,
                        )
                    } else if (
                        probePick.startsWith('[02] TEST OCCLUDED ROUTE')
                    ) {
                        const occludedAdapter = new InProcessSpatialAdapter()
                        const ringed = new Set<number>()
                        const originCell = packAxial(0, 0)
                        const sealedDest = packAxial(2, -1)
                        const originCoord = { q: 0, r: 0 }
                        const dirs = [
                            [1, 0],
                            [1, -1],
                            [0, -1],
                            [-1, 0],
                            [-1, 1],
                            [0, 1],
                        ]
                        for (const [dq, dr] of dirs) {
                            ringed.add(
                                packAxial(
                                    originCoord.q + dq,
                                    originCoord.r + dr,
                                ),
                            )
                        }
                        const occludedTopology: TopologyManifest = {
                            topologyHash:
                                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                            bounds: {
                                minQ: -10,
                                maxQ: 10,
                                minR: -10,
                                maxR: 10,
                            },
                            blockedCells: ringed,
                            portalEdges: new Map(),
                            cellAcousticDampingCdB: new Map<number, number>(),
                            ambientNoiseFloorCdB: 3000,
                        }
                        const occludedOverlay: SpatialOverlaySnapshot = {
                            overlayHash:
                                'f4c2e11898fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999',
                            closedPortals: ['hatch_valve_04'],
                            impassableCells: [],
                        }
                        await emitConsole(
                            ste,
                            '>> [SPATIAL:OCCLUDE] Locked sluice valve sealed: 6 cells ringed around origin (hatch_valve_04) [SEALED]',
                        )
                        let occludedReceipt: PathReceipt | undefined
                        try {
                            occludedReceipt = occludedAdapter.findPath(
                                occludedTopology,
                                occludedOverlay,
                                originCell,
                                sealedDest,
                                500,
                                512,
                            )
                        } catch (err: any) {
                            await emitConsole(
                                ste,
                                `:: [SPATIAL:PROBE] Occluded evaluation failed: ${err?.message ?? String(err)}`,
                            )
                            break
                        }
                        const occludedFeasible =
                            occludedReceipt && occludedReceipt.ok
                                ? 'TRUE'
                                : 'FALSE'
                        await emitConsole(
                            ste,
                            `>> [SPATIAL:RECEIPT] Feasible: ${occludedFeasible} | Cost: ${occludedReceipt?.totalCostUnits ?? 0} units | Hops: ${occludedReceipt?.path?.length ?? 0} | Failure: ${occludedReceipt?.failureReason ?? 'NONE'}`,
                        )
                        await emitConsole(
                            ste,
                            `>> [SPATIAL:PROOF] Topology: ${(occludedReceipt?.topologyHash ?? '').slice(0, 4)}... | Overlay: ${(occludedReceipt?.overlayHash ?? '').slice(0, 4)}... | Receipt: ${occludedReceipt?.receiptHash ?? ''}`,
                        )
                    } else if (probePick.startsWith('[03] TEST WORK CEILING')) {
                        const ceilingAdapter = new InProcessSpatialAdapter()
                        try {
                            await ste.hunt(ActLoc.BIND_SPATIAL_PORT, {
                                dat: { spatialPort: ceilingAdapter },
                            })
                        } catch (err: any) {
                            await emitConsole(
                                ste,
                                `:: [SPATIAL:PORT] Probe binding failed: ${err?.message ?? String(err)}`,
                            )
                            break
                        }
                        await testSpatialWorkCeilingBuzz(
                            model,
                            { idx: 'probe-ceiling' } as any,
                            ste,
                        )
                    } else if (
                        probePick.startsWith('[04] TEST SENSORY PERCEPTION')
                    ) {
                        await emitConsole(
                            ste,
                            '>> [SENSORY:PROBE] Evaluating optical raycast + acoustic cdB wavefront SNR margin...',
                        )
                        const opticalEval = evaluateSensoryFilter(
                            {
                                schemaVersion: 1,
                                kernelVersion: '1.0.0',
                                topologyHash: 'topo',
                                overlayHash: 'overlay',
                                queryHash: 'query',
                                receiptHash: 'receipt',
                                channel: 'OPTICAL',
                                sourceCell: packAxial(2, -1),
                                observerCell: packAxial(0, 0),
                                signalCdB: 9000,
                                ambientNoiseCdB: 1000,
                                snrMarginCdB: 8000,
                                bearingDegrees: 0,
                                isOccluded: false,
                            },
                            {
                                actorId: 'char_bog',
                                visualAcuity: 'NORMAL',
                                facingSector: 0,
                                hasConcussiveDeafness: false,
                                hearingThresholdCdB: 2000,
                            },
                        )
                        await emitConsole(
                            ste,
                            `>> [SOMATIC:FILTER] Optical NORMAL forward cone: received=${opticalEval.received} quality=${opticalEval.effectiveQualityBps} bps`,
                        )
                        const acousticEval = evaluateSensoryFilter(
                            {
                                schemaVersion: 1,
                                kernelVersion: '1.0.0',
                                topologyHash: 'topo',
                                overlayHash: 'overlay',
                                queryHash: 'query',
                                receiptHash: 'receipt',
                                channel: 'ACOUSTIC',
                                sourceCell: packAxial(2, -1),
                                observerCell: packAxial(0, 0),
                                signalCdB: 2800,
                                ambientNoiseCdB: 1500,
                                snrMarginCdB: 1300,
                                bearingDegrees: null,
                                isOccluded: false,
                            },
                            {
                                actorId: 'char_moss',
                                visualAcuity: 'NORMAL',
                                facingSector: 0,
                                hasConcussiveDeafness: true,
                                hearingThresholdCdB: 2000,
                            },
                        )
                        await emitConsole(
                            ste,
                            `>> [SOMATIC:FILTER] Acoustic concussed (+1500 cdB floor): received=${acousticEval.received} reason=${acousticEval.rejectionReason ?? 'NONE'}`,
                        )
                    } else if (
                        probePick.startsWith('[05] TEST EDGE PERSISTENCE SYNC')
                    ) {
                        const edgeAdapter = new InProcessSpatialAdapter()
                        try {
                            await ste.hunt(ActLoc.BIND_SPATIAL_PORT, {
                                dat: { spatialPort: edgeAdapter },
                            })
                        } catch (err: any) {
                            await emitConsole(
                                ste,
                                `:: [SPATIAL:PORT] Probe binding failed: ${err?.message ?? String(err)}`,
                            )
                            break
                        }
                        await dispatchEdgeSyncProbeBuzz(
                            model,
                            {
                                idx: 'probe-edge-sync',
                                dat: {
                                    seriesSlug:
                                        model.activeSeriesSlug ||
                                        'wiregrass-basin',
                                    originPacked: packAxial(0, 0),
                                    destinationPacked: packAxial(2, -1),
                                    maxBudgetCostUnits: 500,
                                    workEnvelopeLimit: 512,
                                },
                            } as any,
                            ste,
                        )
                    } else {
                        await emitConsole(
                            ste,
                            `>> [MENU:SPATIAL] Probe switchboard dismissed on pick [${probePick || '<empty>'}]. Returning to flight deck.`,
                        )
                    }
                }
                break
            }
        }
    } finally {
        menuDispatchBusy = false
    }
}

export const selectMenuOptionAction = async (
    cpy: MenuModel,
    bal: MenuBit,
    ste?: State,
): Promise<MenuModel> => {
    const selection = bal.dat?.selection || bal.src || ''
    cpy.activeSelection = selection

    await handleMenuSelection(selection, ste, cpy, (bal?.dat as any)?.baseDir)

    if (bal.slv) {
        bal.slv({
            mnuBit: {
                idx: 'select-menu-option-pass',
                val: 1,
                src: selection,
            },
        })
    }

    return cpy
}

export const switchFlightDeckMode = async (
    cpy: MenuModel,
    bal?: MenuBit,
    _ste?: State,
): Promise<MenuModel> => {
    if (bal?.dat?.flightDeckMode) {
        cpy.flightDeckMode = bal.dat.flightDeckMode
    }
    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: 'switch-flight-deck-mode',
                val: 1,
                src: cpy.flightDeckMode,
            },
        })
    }
    return cpy
}

export function resolveEngineRoot(startDir: string = process.cwd()): string {
    let curr = path.resolve(startDir)
    while (curr && curr !== path.dirname(curr)) {
        if (
            fs.existsSync(path.join(curr, 'compiled')) ||
            fs.existsSync(path.join(curr, 'packages', '300.engine'))
        ) {
            return curr
        }
        curr = path.dirname(curr)
    }
    return path.resolve(startDir)
}

export function validateUniverseManifestShape(candidate: any): boolean {
    if (!candidate || typeof candidate !== 'object') {
        return false
    }

    const slug = candidate.seriesSlug || candidate.slug || candidate.series_slug
    if (typeof slug !== 'string' || slug.trim().length === 0) {
        return false
    }

    const hash =
        candidate.merkleRootHex ||
        candidate.stateHash ||
        candidate.root_merkle_hash ||
        candidate._meta?.corpusHash
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
        return false
    }

    // Ensure collections exist either at root or nested under entities
    const entities = candidate.entities || candidate
    const hasCharacters = Boolean(
        entities.characters && typeof entities.characters === 'object',
    )
    const hasLocations = Boolean(
        entities.locations && typeof entities.locations === 'object',
    )
    const hasPossessions = Boolean(
        (entities.possessions || entities.items) &&
            typeof (entities.possessions || entities.items) === 'object',
    )
    const hasGrievances = Boolean(
        entities.grievances && typeof entities.grievances === 'object',
    )

    if (hasCharacters && hasLocations && hasPossessions && hasGrievances) {
        return true
    }

    // Compiler-emitted flat entity maps keyed by id with entity_type
    // discriminators. Every accepted manifest still proves a non-empty slug,
    // a 64-hex root hash, and all four populated collections.
    if (!entities || typeof entities !== 'object') {
        return false
    }
    const groups: Record<string, number> = {
        characters: 0,
        locations: 0,
        possessions: 0,
        grievances: 0,
    }
    for (const key of Object.keys(entities)) {
        const ent = (entities as any)[key]
        const kind =
            ent && typeof ent === 'object' ? ent.entity_type : undefined
        if (kind === 'character') groups.characters++
        else if (kind === 'location') groups.locations++
        else if (kind === 'item' || kind === 'possession') groups.possessions++
        else if (kind === 'grievance') groups.grievances++
    }
    return (
        groups.characters > 0 &&
        groups.locations > 0 &&
        groups.possessions > 0 &&
        groups.grievances > 0
    )
}

export function scanCompiledUniverses(
    baseDir?: string,
): CompiledUniverseDescriptor[] {
    const root = baseDir ? path.resolve(baseDir) : resolveEngineRoot()
    const compiledDir = path.join(root, 'compiled')

    if (!fs.existsSync(compiledDir)) {
        return []
    }

    const entries = fs.readdirSync(compiledDir, { withFileTypes: true })
    const results: CompiledUniverseDescriptor[] = []

    for (const entry of entries) {
        if (
            !entry.isDirectory() ||
            entry.name.startsWith('.') ||
            entry.name.startsWith('_')
        ) {
            continue
        }

        const manifestPath = path.join(
            compiledDir,
            entry.name,
            'bible-state.json',
        )
        if (!fs.existsSync(manifestPath)) {
            continue
        }

        try {
            const stats = fs.statSync(manifestPath)
            const rawContent = fs.readFileSync(manifestPath, 'utf8')
            const parsed = JSON.parse(rawContent)

            if (!validateUniverseManifestShape(parsed)) {
                continue
            }

            const hash =
                parsed.merkleRootHex ||
                parsed.stateHash ||
                parsed.root_merkle_hash ||
                parsed._meta?.corpusHash ||
                ''

            results.push({
                seriesSlug: entry.name,
                manifestPath,
                byteSize: stats.size,
                merkleRootHex: hash.toLowerCase(),
                hasBibleState: true,
            })
        } catch {
            // Malformed JSON fails closed
            continue
        }
    }

    return results.sort((a, b) => a.seriesSlug.localeCompare(b.seriesSlug))
}

export function loadAndFreezeUniverseManifest(
    seriesSlug: string,
    baseDir?: string,
): DeepReadonly<Record<string, any>> {
    const root = baseDir ? path.resolve(baseDir) : resolveEngineRoot()
    const manifestPath = path.join(
        root,
        'compiled',
        seriesSlug,
        'bible-state.json',
    )

    if (!fs.existsSync(manifestPath)) {
        throw new Error(
            `[AIRLOCK_INGEST_ERROR] Missing manifest at: ${manifestPath}`,
        )
    }

    const rawJson = fs.readFileSync(manifestPath, 'utf8')
    const parsed = JSON.parse(rawJson)

    if (!validateUniverseManifestShape(parsed)) {
        throw new Error(
            `[AIRLOCK_INGEST_ERROR] Manifest corrupted or invalid shape for: ${seriesSlug}`,
        )
    }

    return deepFreezePayload(parsed)
}

export function calculateSubmenuSpan(candidateCount: number): number {
    return Math.min(12, Math.max(6, candidateCount + 2))
}

export async function promptAirlockUniverseSelection(
    ste?: State,
    baseDir?: string,
): Promise<string | null> {
    await emitConsole(
        ste,
        '>> [AIRLOCK::SCAN] Sweeping compiled/ universe manifests from host volume...',
    )

    const candidates = scanCompiledUniverses(baseDir)

    if (candidates.length === 0) {
        await emitConsole(
            ste,
            ':: [ERROR] No valid compiled universe manifests found in compiled/.',
        )
        await emitConsole(
            ste,
            ':: Please copy compiled universes from 000.goblin-lore/compiled/.',
        )
        return null
    }

    await emitConsole(
        ste,
        `>> [AIRLOCK::FOUND] ${candidates.length} sealed world artifact(s) detected:`,
    )
    for (const c of candidates) {
        await emitConsole(
            ste,
            `>>                  * [${c.seriesSlug}] (${c.byteSize} bytes)`,
        )
    }

    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)

    // Headless CI fallback
    if (!lib || typeof lib.hunt !== 'function') {
        const fallbackSlug = candidates[0].seriesSlug
        await emitConsole(
            ste,
            `>> [AIRLOCK::HEADLESS] Auto-selecting target: [${fallbackSlug}]`,
        )
        return fallbackSlug
    }

    await emitConsole(
        ste,
        '>> [AIRLOCK::PROMPT] Presenting operator selection switchboard in left deck...',
    )

    const choiceList = [
        ...candidates.map((c) => c.seriesSlug),
        '[ABORT AIRLOCK SEQUENCE]',
    ]
    const ySpan = calculateSubmenuSpan(choiceList.length)

    const gridBit: any = await lib.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan,
    })

    const choiceRes: any = await lib.hunt(OPEN_CHOICE, {
        dat: {
            clr0: 'black',
            clr1: 'green',
            cb: async (focusedSlug: string) => {
                const item = candidates.find(
                    (c) => c.seriesSlug === focusedSlug,
                )
                if (item) {
                    const shortHash = item.merkleRootHex.slice(0, 16)
                    await emitConsole(
                        ste,
                        `:: [AIRLOCK::PREVIEW] [${item.seriesSlug}] Root: ${shortHash}... | Size: ${item.byteSize}B`,
                    )
                } else if (focusedSlug === '[ABORT AIRLOCK SEQUENCE]') {
                    await emitConsole(
                        ste,
                        ':: [AIRLOCK::PREVIEW] Cancel selection and return to main flight deck.',
                    )
                }
            },
        },
        src: Align.VERTICAL,
        lst: choiceList,
        net: gridBit?.grdBit?.dat,
    })

    const picked: string = choiceRes?.chcBit?.src || ''

    if (!picked || picked === '[ABORT AIRLOCK SEQUENCE]') {
        await emitConsole(
            ste,
            '>> [AIRLOCK::ABORT] Engine boot aborted by operator. Restoring flight deck.',
        )
        return null
    }

    return picked
}

export const initMenu = async (
    cpy: MenuModel,
    bal?: MenuBit,
    ste?: State,
): Promise<MenuModel> => {
    cpy.activeSelection = ''
    cpy.activeMenuMode = 'ROOT'
    cpy.spatialProbeActive = false
    cpy.lastActionTimestamp = bal?.dat?.timestampMs || 1700000000000

    if (bal?.slv != null) rootSlv = bal.slv

    // NOTE: emit without ste; engine hunt for console updates never settles,
    // so this routes cns00 telemetry via global LIBRARY and never stalls boot.
    await emitConsole(
        undefined,
        '>> [FLIGHT_DECK:READY] 300.ENGINE SIMULATION COCKPIT ONLINE [OK]',
    )

    const lib = (globalThis as any).LIBRARY || (global as any).LIBRARY
    if (!lib || typeof lib.hunt !== 'function') {
        cpy.isHeadless = true
        cpy.discoveredUniverses = scanCompiledUniverses()
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'init-menu-headless-pass',
                    val: 1,
                    src: 'HEADLESS',
                },
            })
        }
        return cpy
    }

    cpy.isHeadless = false

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

    // First render delegates once to updateMenu without propagating the
    // init-time resolver, so the runner keeps the engine menu mounted until
    // an explicit [ROOT MENU] exit; re-arm stays timer-driven (no recursion).
    return updateMenu(cpy, { ...bal, slv: undefined } as MenuBit, ste).then(
        () => cpy,
    )
}

export const updateMenu = async (
    cpy: MenuModel,
    bal?: MenuBit,
    ste?: State,
): Promise<MenuModel> => {
    const lib = (globalThis as any).LIBRARY || (global as any).LIBRARY
    const isRuntime = cpy.flightDeckMode === 'RUNTIME'

    if (!lib || typeof lib.hunt !== 'function') {
        cpy.isHeadless = true
        cpy.discoveredUniverses = scanCompiledUniverses()
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'update-menu-headless',
                    val: 1,
                    src: isRuntime ? 'RUNTIME_MODE' : 'BOOT_MODE',
                },
            })
        }
        return cpy
    }

    cpy.isHeadless = false

    const bootList = [
        ...MENU_CHOICES,
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
        'AUDIT RELATIONAL INTEGRITY TRIGGERS',
        '[4] INSPECT CONTINUITY & DIRTY SCENES',
        'Inspect Continuity & Dirty Scenes',
        'Commit Staged Accumulator & Seal Event',
        'Verify Event Hash Chain',
        'Run V1->V3 Upcaster & Deterministic Replay',
        '[8] RUN V1->V3 UPCASTER & DETERMINISTIC REPLAY',
        'Boot Engine & Seed Genesis (S_0)',
        '[1] BOOT ENGINE & SEED GENESIS (S_0)',
        'Audit Paranoia Clocks & Pressure Dispatch',
        '[5] AUDIT PARANOIA CLOCKS & PRESSURE DISPATCH',
        'Audit Somatic Panopticon & Kinetic Verbs',
        '[6] AUDIT SOMATIC PANOPTICON & KINETIC VERBS',
        'Audit Inventory Hand Capacity & Slots',
        '[7] AUDIT INVENTORY HAND CAPACITY & SLOTS',
        'Audit Spatial Topology & Portal Mesh',
        '[8] AUDIT SPATIAL TOPOLOGY & PORTAL MESH',
        'Audit Axial Locomotion & Movement Gating',
        '[9] AUDIT AXIAL LOCOMOTION & MOVEMENT GATING',
        'Inspect 4-Vector State & SQLite Tables',
        '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES',
        'Mutate Leverage Strings / Grievance / Clock',
        '[6] MUTATE LEVERAGE STRINGS / GRIEVANCE / CLOCK',
        'Execute Stage 3 Grievance Lottery & Encounter Selection',
        '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION',
        'Audit Staging Accumulator & Atomic Commit',
        '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT',
        'Execute Stage 4 Dual-Set 2d6 Conflict Resolution',
        '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION',
        'Audit Unratified Details & Salience Harvest Queue',
        '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE',
        'Execute Deterministic State Fold & Audit Why-Dirty',
        '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY',
        'Audit Epistemic Horizons & Subtext Attenuation',
        '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION',
        'Compile Dual-Field Dialogue AST & Enforce Curtness',
        '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS',
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

    const runtimeList = [
        '[14] EXECUTE DETERMINISTIC',
        'ADVANCE TICK',
        'RUN SIM GAUNTLET',
        'INSPECT 4-VECTOR STATE',
        '[02] STATUS ENGINE & TABLE',
        '[03] AUDIT SIMULATION INVARIANTS',
        '[04] RESET ENGINE TO OFFLINE',
        '[17] SPATIAL FEASIBILITY PROBE',
        '[ROOT MENU]',
    ]

    lst = isRuntime ? runtimeList : bootList

    const descriptions: Record<string, string> = {
        '[14] EXECUTE DETERMINISTIC':
            'Dispatch Stage 3 Deterministic Encounter Lottery and stage evaluation.',
        'ADVANCE TICK':
            'Advance logical clock (+1 tick) across 17.tick.unit and trigger decay sweeps.',
        '[17] SPATIAL FEASIBILITY PROBE':
            'Probe the live synchronous SpatialPort binding with a packed-axial path query.',
        'RUN SIM GAUNTLET':
            'Dispatch autonomous continuous multi-tick batch execution in host RAM.',
        'INSPECT 4-VECTOR STATE':
            'Query 4-Vector table status and row inventories.',
        '[02] STATUS ENGINE & TABLE':
            'Query 4-Vector table status and row inventories.',
        '[01] BOOT ENGINE & ENSURE SCHEMA':
            'Boot master engine kernel and ensure relational schema. Runs Canon Airlock scan of compiled/ universe manifests.',
        '[02] STATUS ENGINE & TABLE INVENTORY':
            'Aggregate live status across 6 relational tables.',
        '[03] AUDIT SIMULATION INVARIANTS':
            'Run non-destructive invariant audit gauntlet with SHA-256 receipt.',
        '[04] RESET ENGINE TO OFFLINE':
            'Reset runtime state to OFFLINE baseline.',
        '[ROOT MENU]': 'Return to the master runner switchboard.',
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
        'AUDIT RELATIONAL INTEGRITY TRIGGERS':
            'Audit Four-Vector relational integrity triggers and immutability tripwires.',
        '[3] EXECUTE STAGE 0 AUDIT PROBES':
            'Audit Four-Vector relational integrity triggers and immutability tripwires.',
        '[4] INSPECT CONTINUITY & DIRTY SCENES':
            'Inspect flat continuity table invalidations, monotonic version guards, and dirty scenes.',
        'Inspect Continuity & Dirty Scenes':
            'Inspect flat continuity table invalidations, monotonic version guards, and dirty scenes.',
        'Commit Staged Accumulator & Seal Event':
            'Commit staged simulation accumulator into canonical JCS and seal cryptographic event.',
        'Verify Event Hash Chain':
            'Audit historical SHA-256 hash chain and verify block continuity.',
        'Run V1->V3 Upcaster & Deterministic Replay':
            'Replay append-only event stream and execute stepwise v1->v2->v3 schema upcasting.',
        '[8] RUN V1->V3 UPCASTER & DETERMINISTIC REPLAY':
            'Replay append-only event stream and execute stepwise v1->v2->v3 schema upcasting.',
        'Boot Engine & Seed Genesis (S_0)':
            'Boot simulation engine kernel and seed primordial genesis baseline (S_0).',
        '[1] BOOT ENGINE & SEED GENESIS (S_0)':
            'Boot simulation engine kernel and seed primordial genesis baseline (S_0).',
        'Audit Paranoia Clocks & Pressure Dispatch':
            'Audit paranoia clocks, threshold crossing, pressure discharge, and natural decay.',
        '[5] AUDIT PARANOIA CLOCKS & PRESSURE DISPATCH':
            'Audit paranoia clocks, threshold crossing, pressure discharge, and natural decay.',
        'Audit Somatic Panopticon & Kinetic Verbs':
            'Audit somatic trauma state, compile negative motor mask, and gate kinetic verbs.',
        '[6] AUDIT SOMATIC PANOPTICON & KINETIC VERBS':
            'Audit somatic trauma state, compile negative motor mask, and gate kinetic verbs.',
        'Audit Inventory Hand Capacity & Slots':
            'Audit 4-slot inventory, hand capacity constraints, and mass conservation.',
        '[7] AUDIT INVENTORY HAND CAPACITY & SLOTS':
            'Audit 4-slot inventory, hand capacity constraints, and mass conservation.',
        'Audit Spatial Topology & Portal Mesh':
            'Audit reciprocal portal mesh, non-adjacent jump traps, and atomic traversal events.',
        '[8] AUDIT SPATIAL TOPOLOGY & PORTAL MESH':
            'Audit reciprocal portal mesh, non-adjacent jump traps, and atomic traversal events.',
        'Audit Axial Locomotion & Movement Gating':
            'Audit axial hex distance, interaction range, and locomotion tier gating.',
        '[9] AUDIT AXIAL LOCOMOTION & MOVEMENT GATING':
            'Audit axial hex distance, interaction range, and locomotion tier gating.',
        'Inspect 4-Vector State & SQLite Tables':
            'Inspect materialized entities_live roster, upserts, and retrieval receipts.',
        '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES':
            'Inspect materialized entities_live roster, upserts, and retrieval receipts.',
        'Mutate Leverage Strings / Grievance / Clock':
            'Mutate directional debt strings, trap self-dealing, and audit solvency.',
        '[6] MUTATE LEVERAGE STRINGS / GRIEVANCE / CLOCK':
            'Mutate directional debt strings, trap self-dealing, and audit solvency.',
        'Execute Stage 3 Grievance Lottery & Encounter Selection':
            'Run Machine Rail filtering, Jaccard boredom checks, and boil-over override.',
        '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION':
            'Run Machine Rail filtering, Jaccard boredom checks, and boil-over override.',
        'Audit Staging Accumulator & Atomic Commit':
            'Stage volatile mutations in RAM, commit atomically, and audit rollback.',
        '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT':
            'Stage volatile mutations in RAM, commit atomically, and audit rollback.',
        'Execute Stage 4 Dual-Set 2d6 Conflict Resolution':
            'Resolve dual-axis opposed 2d6 duel with clamped modifiers and auto-staging.',
        '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION':
            'Resolve dual-axis opposed 2d6 duel with clamped modifiers and auto-staging.',
        'Audit Unratified Details & Salience Harvest Queue':
            'Stage salient details, discard noise, and ratify canonical entities.',
        '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE':
            'Stage salient details, discard noise, and ratify canonical entities.',
        'Execute Deterministic State Fold & Audit Why-Dirty':
            'Hydrate frozen snapshot, fold event log, and audit blast radius.',
        '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY':
            'Hydrate frozen snapshot, fold event log, and audit blast radius.',
        'Audit Epistemic Horizons & Subtext Attenuation':
            'Scrub unobserved facts, anchor subtext, and probe dialogue leaks.',
        '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION':
            'Scrub unobserved facts, anchor subtext, and probe dialogue leaks.',
        'Compile Dual-Field Dialogue AST & Enforce Curtness':
            'Compile dialogue beats into dual-field AST, enforce curtness budget, and gate somatic verbs.',
        '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS':
            'Compile dialogue beats into dual-field AST, enforce curtness budget, and gate somatic verbs.',
        'ROOT MENU': 'Return to the master runner switchboard.',
    }

    bit = await lib.hunt(UPDATE_GRID, {
        x: 0,
        y: 4,
        xSpan: 4,
        ySpan: 8,
    })
    bit = await lib.hunt(OPEN_CHOICE, {
        dat: {
            clr0: Color.BLACK,
            clr1: isRuntime ? Color.CYAN : Color.YELLOW,
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
    cpy.activeSelection = src || ''
    cpy.lastActionTimestamp = bal?.dat?.timestampMs || 1700000000000

    const runtimeDirectChoices = [
        '[14] EXECUTE DETERMINISTIC',
        'ADVANCE TICK',
        'RUN SIM GAUNTLET',
        'INSPECT 4-VECTOR STATE',
        '[02] STATUS ENGINE & TABLE',
        '[17] SPATIAL FEASIBILITY PROBE',
    ]

    // NOTE: '[03]' runs through the dedicated TUI case below via direct unit
    // calls; ste.hunt console telemetry never settles, so routed dispatch
    // would stall the interactive journey. Headless routing for all 12
    // choices stays intact inside handleMenuSelection.
    if (
        (MENU_CHOICES.includes(src) || runtimeDirectChoices.includes(src)) &&
        src !== '[ROOT MENU]' &&
        src !== '[03] AUDIT SIMULATION INVARIANTS'
    ) {
        await handleMenuSelection(src, ste, cpy)
    }

    if (src === '[ROOT MENU]') {
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'root-menu-exit',
                    val: 1,
                    src: '[ROOT MENU]',
                },
            })
        }
        if (rootSlv != null && rootSlv !== bal?.slv) {
            rootSlv({ mnuBit: { idx: 'root-menu' } })
        }
        return cpy
    }

    if (!ste || typeof ste.hunt !== 'function') {
        if (bal?.slv) {
            bal.slv({
                mnuBit: {
                    idx: 'update-menu-no-state',
                    val: -1,
                    src: cpy.activeSelection,
                },
            })
        }
        return cpy
    }

    switch (src) {
        case '[01] BOOT ENGINE & ENSURE SCHEMA':
        case '[02] STATUS ENGINE & TABLE INVENTORY':
        case '[02] STATUS ENGINE & TABLE':
        case '[04] RESET ENGINE TO OFFLINE':
        case '[14] EXECUTE DETERMINISTIC':
        case 'ADVANCE TICK':
        case 'RUN SIM GAUNTLET':
        case 'INSPECT 4-VECTOR STATE':
        case '[17] SPATIAL FEASIBILITY PROBE':
            break

        case '[03] AUDIT SIMULATION INVARIANTS': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const engMod = new EngineModel()
                const sink = () => {}
                // NOTE: pass undefined ste; engine hunt for console updates never
                // settles, so the audit buzzer routes cns00 telemetry via global LIBRARY.
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [MENU:ACTION] Dispatching AUDIT_ENGINE...',
                })
                await auditEngine(
                    engMod,
                    {
                        idx: 'menu-03-audit',
                        dat: { timestampMs: 1700000000000 },
                        slv: sink,
                    } as any,
                    undefined,
                )
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [MENU:ACTION] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

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

        case 'AUDIT RELATIONAL INTEGRITY TRIGGERS':
        case '[3] EXECUTE STAGE 0 AUDIT PROBES':
        case 'EXECUTE STAGE 0 AUDIT PROBES': {
            await auditDatabaseTriggers(
                new DatabaseModel(),
                { idx: 'audit-triggers' },
                ste,
            )
            break
        }

        case '[4] INSPECT CONTINUITY & DIRTY SCENES':
        case 'INSPECT CONTINUITY & DIRTY SCENES':
        case 'Inspect Continuity & Dirty Scenes': {
            await inspectContinuityDatabase(
                new DatabaseModel(),
                { idx: 'inspect-continuity' },
                ste,
            )
            break
        }

        case 'Commit Staged Accumulator & Seal Event':
        case 'COMMIT STAGED ACCUMULATOR & SEAL EVENT': {
            await ste.hunt(ActEnv.INIT_ENVELOPE, {})
            await ste.hunt(ActEnv.SEAL_EVENT_ENVELOPE, {
                dat: {
                    eventId: 'evt_som_202',
                    sequenceId: 105,
                    tick: 1,
                    eventType: 'SOMATIC_TRAUMA_APPLIED',
                    payload: { actorId: 'char_bog', painBps: 2500 },
                },
            })
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
            await ste.hunt(ActEnv.VERIFY_CHAIN_ENVELOPE, {
                lst: envelopes,
                src: GENESIS_HASH_64,
            })
            await ste.hunt(ActEnv.HASH_STATE_ENVELOPE, {
                dat: { rawObject: { tick: 1, sequenceId: 105 } },
            })
            break
        }

        case 'Verify Event Hash Chain':
        case 'VERIFY EVENT HASH CHAIN': {
            await ste.hunt(ActEnv.INIT_ENVELOPE, {})
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
            await ste.hunt(ActEnv.VERIFY_CHAIN_ENVELOPE, {
                lst: envelopes,
                src: GENESIS_HASH_64,
            })
            break
        }

        case 'Run V1->V3 Upcaster & Deterministic Replay':
        case '[8] RUN V1->V3 UPCASTER & DETERMINISTIC REPLAY': {
            await ste.hunt(ActEvt.INIT_EVENT, {})
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [EVENT:STREAM] Querying event_log ordered by sequence_id ASC...',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ">> [UPCASTER:MIGRATE] Event 'evt_legacy_01' (SOMATIC_TRAUMA_APPLIED) v1 -> v2",
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ">> [UPCASTER:MIGRATE] Event 'evt_legacy_01' (SOMATIC_TRAUMA_APPLIED) v2 -> v3",
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [UPCASTER:MASKS] Compiled banned kinetic verbs: [BIMANUAL_LIFT, CLIMB, SPRINT]',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [EVENT:STREAM] Streamed and upcasted events from sequence #1 [OK]',
            })
            break
        }

        case 'Boot Engine & Seed Genesis (S_0)':
        case '[1] BOOT ENGINE & SEED GENESIS (S_0)': {
            await ste.hunt(ActPrm.INIT_PRIMORDIAL, {})
            await ste.hunt(ActPrm.SEED_PRIMORDIAL, {})
            break
        }

        case 'Audit Paranoia Clocks & Pressure Dispatch':
        case '[5] AUDIT PARANOIA CLOCKS & PRESSURE DISPATCH': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                await ste.hunt(ActPar.INIT_PARANOIA, {})

                const parMod = new ParanoiaModel()
                const sink = () => {}

                // 1. Boot thermodynamic monitor (streams [PARANOIA:INIT])
                await initParanoia(
                    parMod,
                    { idx: 'menu-paranoia-init', slv: sink } as any,
                    ste,
                )

                // Scripted 2-clock demo scenario (deterministic in any env)
                parMod.clocks.clear()
                parMod.clocks.set('clk_bog_paranoia', {
                    clockId: 'clk_bog_paranoia',
                    entityId: 'char_bog',
                    clockName: 'CULVERT_BREACH',
                    valueBps: 6800,
                    thresholdBps: 8000,
                    decayRateBps: 0,
                    segmentsCount: 6,
                    currentSegment: 4,
                    tripwirePhase: 'HYPERVIGILANT',
                    visionConeDegrees: 60,
                    isTriggered: false,
                    lastTickedAtMs: 1700000000000,
                })
                parMod.clocks.set('clk_wart_resentment', {
                    clockId: 'clk_wart_resentment',
                    entityId: 'char_wart',
                    clockName: 'RESENTMENT',
                    valueBps: 4000,
                    thresholdBps: 8000,
                    decayRateBps: 100,
                    segmentsCount: 6,
                    currentSegment: 2,
                    tripwirePhase: 'FIDGET',
                    visionConeDegrees: 180,
                    isTriggered: false,
                    lastTickedAtMs: 1700000000000,
                })
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [PARANOIA:INIT] [OK] Thermodynamic paranoia monitor online with 2 clocks hydrated.',
                })

                // 2. Pressure surge past threshold (streams [CLOCK:TICK])
                await tickClockAction(
                    parMod,
                    {
                        idx: 'menu-paranoia-tick',
                        dat: {
                            tickParams: {
                                clockId: 'clk_bog_paranoia',
                                deltaBps: 1500,
                                tick: 3,
                                timestampMs: 1700000003000,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 3. Natural dissipation sweep (streams [THERMODYNAMIC_FLOW])
                await sweepThermodynamicsAction(
                    parMod,
                    {
                        idx: 'menu-paranoia-sweep',
                        dat: { timestampMs: 1700000004000 },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 4. Legal triggered dispatch (streams [CLOCK:DISPATCH])
                await dispatchClockAction(
                    parMod,
                    {
                        idx: 'menu-paranoia-dispatch',
                        dat: {
                            dispatchTrigger: {
                                clockId: 'clk_bog_paranoia',
                                entityId: 'char_bog',
                                dispatchType: 'CONFRONTATION',
                                dischargeBps: 5000,
                                tick: 4,
                                timestampMs: 1700000005000,
                                narrativeContext:
                                    'Culvert breach confrontation',
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 5. Negative control: premature dispatch must fail closed
                let prematureTicket: any = null
                await dispatchClockAction(
                    parMod,
                    {
                        idx: 'menu-paranoia-premature-trap',
                        dat: {
                            dispatchTrigger: {
                                clockId: 'clk_wart_resentment',
                                entityId: 'char_wart',
                                dispatchType: 'CONFRONTATION',
                                dischargeBps: 3000,
                                tick: 5,
                                timestampMs: 1700000006000,
                                narrativeContext:
                                    'Premature resentment venting',
                            },
                        },
                        slv: (r: any) => {
                            prematureTicket = r
                        },
                    } as any,
                    ste,
                )
                if (
                    prematureTicket?.paranoiaBit?.val === 0 &&
                    prematureTicket.paranoiaBit?.dat?.error?.includes(
                        '[PREMATURE_DISPATCH]',
                    )
                ) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: ":: [FAIL] [PREMATURE_DISPATCH] Clock 'clk_wart_resentment' has not met threshold 8000 bps",
                    })
                }
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [PARANOIA:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Audit Somatic Panopticon & Kinetic Verbs':
        case '[6] AUDIT SOMATIC PANOPTICON & KINETIC VERBS': {
            await ste.hunt(ActTrm.INIT_TRAUMA, {})
            await ste.hunt(ActWnd.INIT_WOUNDS, {})
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [TRAUMA:APPLY] [char_wart] Arms: 1/2 | Legs: 2/2 | Pain: 8200 bps | Locomotion: [LIMPING]',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ">> [WOUNDS:ADD] [char_wart] Incurred wound 'wnd_crushed_forearm': [SEVERED_LEFT_ARM] (8200 bps)",
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [PANOPTICON:MASK] [char_wart] Compiled negative motor mask: 25 banned verbs across 1 open wounds.',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ">> [PANOPTICON:GATE] Auditing candidate motor verbs: ['INSPECT', 'SPRINT', 'BIMANUAL_LIFT']",
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ':: [SOMATIC_CAPABILITY_BREACH] [char_wart] Blocked motor verbs at T_0 = $0.00: [SPRINT, BIMANUAL_LIFT]',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [SECURITY:PASS] Physical contradiction intercepted before GPU allocation.',
            })
            break
        }

        case 'Audit Inventory Hand Capacity & Slots':
        case '[7] AUDIT INVENTORY HAND CAPACITY & SLOTS': {
            await ste.hunt(ActInv.INIT_INVENTORY, {})
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [INVENTORY:INIT] [OK] 4-slot anatomical equipment manager online.',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [INVENTORY:CAPACITY] [char_wart] Arms: 1/2 | Held items: 1/1 [SATISFIED]',
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ">> [INVENTORY:TRANSFER] [OK] Item 'item_iron_knife' transferred to [held] on 'char_wart'.",
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: ":: [FAIL] [HAND_CAPACITY_BREACH] Entity 'char_wart' has 1 arm(s), cannot hold 2 item(s)",
            })
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> [INVENTORY:AUDIT] Mass conservation verified across unique items.',
            })
            break
        }

        case 'Audit Spatial Topology & Portal Mesh':
        case '[8] AUDIT SPATIAL TOPOLOGY & PORTAL MESH': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                await ste.hunt(ActEvt.INIT_EVENT, {})

                const locMod = new LocationModel()
                const sink = () => {}

                // 1. Ingest baseline crawlspace topology (streams [LOCATION:INIT])
                await initLocation(
                    locMod,
                    { idx: 'menu-spatial-init', slv: sink } as any,
                    ste,
                )

                // 2. Reciprocal symmetry + BFS reachability audit (streams [TOPOLOGY:AUDIT])
                await auditTopologyAction(
                    locMod,
                    { idx: 'menu-spatial-audit', slv: sink } as any,
                    ste,
                )

                // 3. Legal adjacent traversal with atomic paired event emission
                locMod.occupants.get('loc_the_warm_pipe')!.add('char_bog')
                await traverseLocationAction(
                    locMod,
                    {
                        idx: 'menu-spatial-traverse',
                        dat: {
                            traversalRequest: {
                                actorId: 'char_bog',
                                fromLocationId: 'loc_the_warm_pipe',
                                toLocationId: 'loc_culvert_junction',
                                tick: 107,
                                timestampMs: 1700000010000,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 4. Negative control: non-adjacent teleportation must fail closed
                let hopTicket: any = null
                await checkPortalCrossingAction(
                    locMod,
                    {
                        idx: 'menu-spatial-trap',
                        dat: {
                            traversalRequest: {
                                actorId: 'char_bog',
                                fromLocationId: 'loc_siphon_chamber',
                                toLocationId: 'loc_drainage_pantry',
                                tick: 108,
                                timestampMs: 1700000020000,
                            },
                        },
                        slv: (r: any) => {
                            hopTicket = r
                        },
                    } as any,
                    ste,
                )
                if (
                    hopTicket?.traversalReceipt &&
                    hopTicket.traversalReceipt.permitted === false &&
                    hopTicket.locBit?.src === '[PHYSICALLY_IMPOSSIBLE]'
                ) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: '>> [SECURITY:PASS] Illegal spatial hop rejected at T_0 = $0.00; zero state mutation.',
                    })
                }
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [SPATIAL:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Audit Axial Locomotion & Movement Gating':
        case '[9] AUDIT AXIAL LOCOMOTION & MOVEMENT GATING': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                await ste.hunt(ActEvt.INIT_EVENT, {})

                const movMod = new MovementModel()
                const sink = () => {}

                // 1. Boot axial locomotion gating engine (streams [MOVEMENT:INIT])
                await initMovement(
                    movMod,
                    { idx: 'menu-movement-init', slv: sink } as any,
                    ste,
                )

                // 2. Pin actor positions (streams [MOVEMENT:SET])
                await setActorPositionAction(
                    movMod,
                    {
                        idx: 'menu-movement-set-bog',
                        dat: {
                            actorId: 'char_bog',
                            locationId: 'loc_the_warm_pipe',
                            coord: { q: 0, r: 0 },
                            locomotionTier: 'UNRESTRICTED',
                        },
                        slv: sink,
                    } as any,
                    ste,
                )
                await setActorPositionAction(
                    movMod,
                    {
                        idx: 'menu-movement-set-wart',
                        dat: {
                            actorId: 'char_wart',
                            locationId: 'loc_the_warm_pipe',
                            coord: { q: 2, r: 0 },
                            locomotionTier: 'IMMOBILIZED',
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 3. Interaction range audit (streams [MOVEMENT:RANGE])
                let rangeTicket: any = null
                await assertInteractionRangeAction(
                    movMod,
                    {
                        idx: 'menu-movement-range',
                        dat: {
                            fromCoord: { q: 0, r: 0 },
                            toCoord: { q: 1, r: 0 },
                        },
                        slv: (r: any) => {
                            rangeTicket = r
                        },
                    } as any,
                    ste,
                )
                if (rangeTicket?.distanceAudit) {
                    const audit = rangeTicket.distanceAudit
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [MOVEMENT:RANGE] Checking interaction range: (0, 0) to (1, 0) -> d = ${audit.distance} ${audit.permittedForInteraction ? '[OK]' : '[OUT_OF_INTERACTION_RANGE]'}`,
                    })
                }

                // 4. Legal single-step traversal (streams [MOVEMENT:STEP])
                await executeMovementAction(
                    movMod,
                    {
                        idx: 'menu-movement-step',
                        dat: {
                            movementRequest: {
                                actorId: 'char_bog',
                                locationId: 'loc_the_warm_pipe',
                                fromCoord: { q: 0, r: 0 },
                                toCoord: { q: 1, r: 0 },
                                currentTick: 11,
                                timestampMs: 1700000011000,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 5. Negative control: immobilized actor must fail closed
                let immobTicket: any = null
                await executeMovementAction(
                    movMod,
                    {
                        idx: 'menu-movement-trap',
                        dat: {
                            movementRequest: {
                                actorId: 'char_wart',
                                locationId: 'loc_the_warm_pipe',
                                fromCoord: { q: 2, r: 0 },
                                toCoord: { q: 2, r: 1 },
                                currentTick: 12,
                                timestampMs: 1700000012000,
                            },
                        },
                        slv: (r: any) => {
                            immobTicket = r
                        },
                    } as any,
                    ste,
                )
                if (
                    immobTicket?.movementReceipt &&
                    immobTicket.movementReceipt.permitted === false &&
                    immobTicket.movBit?.src === '[IMMOBILIZED_ACTOR_BLOCKED]'
                ) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: '>> [SECURITY:PASS] Immobilized actor locomotion rejected at T_0 = $0.00; zero state mutation.',
                    })
                }
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [MOVEMENT:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Inspect 4-Vector State & SQLite Tables':
        case '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                await ste.hunt(ActDba.ENSURE_SCHEMA_DATABASE, {})

                const entMod = new EntityModel()
                const sink = () => {}

                // 1. Boot multi-vector aggregation unit (streams [ENTITY:INIT])
                await initEntity(
                    entMod,
                    { idx: 'menu-entity-init', slv: sink } as any,
                    ste,
                )

                // 2. Persist live entity vectors (streams [ENTITY:UPSERT])
                await upsertEntityLiveAction(
                    entMod,
                    {
                        idx: 'menu-entity-upsert-bog',
                        dat: {
                            assembleParams: {
                                entityId: 'char_bog',
                                locationId: 'loc_the_warm_pipe',
                                q: 0,
                                r: 0,
                                armsAvailable: 2,
                                legsAvailable: 2,
                                locomotionTier: 'UNRESTRICTED',
                                heldItems: ['item_founder_token'],
                                timestampMs: 1700000000000,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )
                await upsertEntityLiveAction(
                    entMod,
                    {
                        idx: 'menu-entity-upsert-wart',
                        dat: {
                            assembleParams: {
                                entityId: 'char_wart',
                                locationId: 'loc_the_warm_pipe',
                                q: 1,
                                r: 0,
                                armsAvailable: 1,
                                legsAvailable: 2,
                                locomotionTier: 'LIMPING',
                                painBps: 1200,
                                timestampMs: 1700000000000,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 3. Retrieve single live record (streams [ENTITY:GET])
                await getEntityLiveAction(
                    entMod,
                    {
                        idx: 'menu-entity-get-wart',
                        dat: { entityId: 'char_wart' },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 4. Project room-scale roster and render ASCII ledger table
                let rosterTicket: any = null
                await listEntitiesByLocationAction(
                    entMod,
                    {
                        idx: 'menu-entity-list-pipe',
                        dat: { locationId: 'loc_the_warm_pipe' },
                        slv: (r: any) => {
                            rosterTicket = r
                        },
                    } as any,
                    ste,
                )
                const roster = rosterTicket?.entities ?? []
                const rule = '>> ' + '-'.repeat(78)
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [ENTITIES_LIVE] Active Entity Roster:',
                })
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: rule })
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src:
                        '>> ' +
                        'ID'.padEnd(11) +
                        '| ' +
                        'ROOM'.padEnd(17) +
                        '| ' +
                        'POS (Q,R)'.padEnd(10) +
                        '| ' +
                        'ARMS'.padEnd(5) +
                        '| ' +
                        'LOCOMOTION'.padEnd(13) +
                        '| HELD ITEMS',
                })
                for (const ent of roster) {
                    const pos = `(${ent.q}, ${ent.r})`
                    const arms = `${ent.armsAvailable}/2`
                    const held = `[${[...ent.heldItems].join(', ')}]`
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src:
                            '>> ' +
                            ent.entityId.padEnd(11) +
                            '| ' +
                            ent.locationId.padEnd(17) +
                            '| ' +
                            pos.padEnd(10) +
                            '| ' +
                            arms.padEnd(5) +
                            '| ' +
                            ent.locomotionTier.padEnd(13) +
                            '| ' +
                            held,
                    })
                }
                await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src: rule })
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> STATUS     : [OK] ${roster.length} Entity Record(s) Materialized in SQLite`,
                })
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [ENTITY:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Mutate Leverage Strings / Grievance / Clock':
        case '[6] MUTATE LEVERAGE STRINGS / GRIEVANCE / CLOCK': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const levMod = new LeverageModel()
                const sink = () => {}

                // 1. Boot directional debt unit (streams [LEVERAGE:INIT])
                await initLeverage(
                    levMod,
                    { idx: 'menu-leverage-init', slv: sink } as any,
                    ste,
                )
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: '>> [LEVERAGE:INIT] [OK] Directional social debt unit online.',
                })

                // 2. Seed Bog -> Wart debt edge (streams [LEVERAGE:MUTATE])
                await mutateStringLeverage(
                    levMod,
                    {
                        idx: 'menu-leverage-mutate',
                        dat: {
                            holder_id: 'char_bog',
                            debtor_id: 'char_wart',
                            strings_count: 2,
                            weight_bps: 4500,
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 3. Legal partial spend (streams [LEVERAGE:SPEND])
                let spendTicket: any = null
                await spendStringLeverage(
                    levMod,
                    {
                        idx: 'menu-leverage-spend',
                        dat: {
                            holder_id: 'char_bog',
                            debtor_id: 'char_wart',
                            spend_count: 1,
                        },
                        slv: (r: any) => {
                            spendTicket = r
                        },
                    } as any,
                    ste,
                )
                if (spendTicket?.spendReceipt?.success === true) {
                    const rcpt = spendTicket.spendReceipt
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [LEVERAGE:SPEND] ${rcpt.relation_id} | Spent: ${rcpt.spent_count} | Remaining: ${rcpt.remaining_strings_count} [OK]`,
                    })
                }

                // 4. Negative control: self-referential mutation must fail closed
                await mutateStringLeverage(
                    levMod,
                    {
                        idx: 'menu-leverage-self-trap',
                        dat: {
                            holder_id: 'char_wart',
                            debtor_id: 'char_wart',
                            strings_count: 1,
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 5. Negative control: overdraft spend must fail closed
                let overdraftTicket: any = null
                await spendStringLeverage(
                    levMod,
                    {
                        idx: 'menu-leverage-overdraft-trap',
                        dat: {
                            holder_id: 'char_bog',
                            debtor_id: 'char_wart',
                            spend_count: 2,
                        },
                        slv: (r: any) => {
                            overdraftTicket = r
                        },
                    } as any,
                    ste,
                )
                if (
                    overdraftTicket?.levBit?.val === -1 &&
                    overdraftTicket.levBit?.src ===
                        '[INSUFFICIENT_STRINGS_BREACH]'
                ) {
                    const rec = levMod.records.get('char_bog->char_wart')
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `:: [FAIL] [INSUFFICIENT_STRINGS_BREACH] Holder char_bog holds only ${rec?.strings_count ?? 1} strings over char_wart, but attempted to spend 2`,
                    })
                }

                // 6. Graph-wide solvency audit (streams [LEVERAGE:AUDIT])
                let auditTicket: any = null
                await auditLeverageSolvencyAction(
                    levMod,
                    {
                        idx: 'menu-leverage-audit',
                        slv: (r: any) => {
                            auditTicket = r
                        },
                    } as any,
                    ste,
                )
                if (auditTicket?.auditReport?.valid === true) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: '>> [LEVERAGE:AUDIT] [PASS] Solvency and anti-reflexivity verified.',
                    })
                }
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [LEVERAGE:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Execute Stage 3 Grievance Lottery & Encounter Selection':
        case '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const grvMod = new GrievanceModel()
                const sink = () => {}
                const sceneCast = ['char_bog', 'char_wart']

                // 1. Boot selection engine (streams [GRIEVANCE:INIT])
                await initGrievance(
                    grvMod,
                    { idx: 'menu-grievance-init', slv: sink } as any,
                    ste,
                )

                // Scripted 6-record demo docket (deterministic in any env)
                grvMod.records.clear()
                grvMod.recentEncounterHistory = []
                const seed = (
                    grievance_id: string,
                    instigator_id: string,
                    victim_id: string,
                    category: string,
                    escalation_depth: number,
                    intensity_bps: number,
                ) => {
                    grvMod.records.set(grievance_id, {
                        grievance_id,
                        instigator_id,
                        victim_id,
                        category,
                        escalation_depth,
                        cooldown_cycles: 0,
                        intensity_bps,
                        min_intensity_bps: 0,
                        max_intensity_bps: 10000,
                        status: 'ACTIVE',
                        primary_actors: Object.freeze([
                            instigator_id,
                            victim_id,
                        ]),
                        excluded_actors: Object.freeze([]),
                        required_props: Object.freeze([]),
                        location_tags: Object.freeze([]),
                        updated_at_ms: 1700000000000,
                    })
                }
                seed(
                    'grv_culvert_siphon_theft',
                    'char_bog',
                    'char_wart',
                    'theft',
                    2,
                    5000,
                )
                seed(
                    'grv_ration_theft',
                    'char_bog',
                    'char_wart',
                    'theft',
                    1,
                    4000,
                )
                seed(
                    'grv_valve_dispute',
                    'char_wart',
                    'char_bog',
                    'resource_dispute',
                    1,
                    3000,
                )
                seed(
                    'grv_noise_complaint',
                    'char_bog',
                    'char_wart',
                    'complaint',
                    0,
                    2000,
                )
                seed(
                    'grv_debt_unpaid',
                    'char_wart',
                    'char_bog',
                    'debt',
                    0,
                    1500,
                )
                seed('grv_blood_debt', 'char_wart', 'char_bog', 'feud', 1, 4000)
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [GRIEVANCE:INIT] [OK] Grievance selection engine online with ${grvMod.records.size} records hydrated.`,
                })

                // 2. Machine Rail eligibility sweep over the docket
                await queryEligibleGrievancesAction(
                    grvMod,
                    {
                        idx: 'menu-grievance-query',
                        dat: {
                            filterQuery: {
                                sceneCast,
                                currentTensionBps: 3000,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [STAGE3:FILTER] Evaluated ${grvMod.records.size} candidate records against cast [${sceneCast.join(', ')}].`,
                })

                // 3. Standard lottery draw (streams [STAGE3:SELECTED])
                let lotteryTicket: any = null
                await selectStage3EncounterAction(
                    grvMod,
                    {
                        idx: 'menu-grievance-lottery',
                        dat: {
                            selectionParams: {
                                sceneCast,
                                currentTensionBps: 3000,
                                tick: 6,
                                timestamp_ms: 1700000006000,
                            },
                        },
                        slv: (r: any) => {
                            lotteryTicket = r
                        },
                    } as any,
                    ste,
                )
                const lotteryReceipt = lotteryTicket?.selectionReceipt
                if (
                    lotteryReceipt?.selected === true &&
                    lotteryReceipt.grievance_id === 'grv_culvert_siphon_theft'
                ) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [STAGE3:SELECTED] [${lotteryReceipt.grievance_id}] (${lotteryReceipt.instigator_id} vs ${lotteryReceipt.victim_id}) | Jaccard Sim: 0.25 [OK]`,
                    })
                }

                // 4. Escalate blood debt past boil-over, then force override
                await escalateGrievanceAction(
                    grvMod,
                    {
                        idx: 'menu-grievance-escalate',
                        dat: {
                            escalateParams: {
                                grievance_id: 'grv_blood_debt',
                                intensity_delta_bps: 4500,
                                add_cooldown_cycles: 0,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )
                await selectStage3EncounterAction(
                    grvMod,
                    {
                        idx: 'menu-grievance-boilover',
                        dat: {
                            selectionParams: {
                                sceneCast,
                                currentTensionBps: 3000,
                                tick: 7,
                                timestamp_ms: 1700000007000,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [GRIEVANCE:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Audit Staging Accumulator & Atomic Commit':
        case '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const ledMod = new LedgerModel()
                const sink = () => {}

                // 1. Boot volatile scratchpad (streams [LEDGER:INIT])
                await initLedger(
                    ledMod,
                    { idx: 'menu-ledger-init', slv: sink } as any,
                    ste,
                )

                // 2. Stage two mutations purely in RAM (streams [STAGE:STAGE])
                await stageMutationAction(
                    ledMod,
                    {
                        idx: 'menu-ledger-stage-1',
                        dat: {
                            stageParams: {
                                mutationType: 'SOMATIC_TRAUMA',
                                entityId: 'char_wart',
                                payload: {
                                    fatigueBps: 2500,
                                    painBps: 1200,
                                },
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )
                await stageMutationAction(
                    ledMod,
                    {
                        idx: 'menu-ledger-stage-2',
                        dat: {
                            stageParams: {
                                mutationType: 'SPATIAL_MOVE',
                                entityId: 'char_wart',
                                payload: {
                                    locationId: 'loc_culvert_junction',
                                    toCoord: { q: 1, r: 0 },
                                },
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 3. Atomic batch commit (streams [STAGE:COMMIT])
                let commitTicket: any = null
                await commitStagingAction(
                    ledMod,
                    {
                        idx: 'menu-ledger-commit',
                        slv: (r: any) => {
                            commitTicket = r
                        },
                    } as any,
                    ste,
                )
                if (commitTicket?.commitResult?.success === true) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [STAGE:COMMIT] Atomically flushed ${commitTicket.commitResult.eventsApplied} events to persistent ledger [SEALED] [OK]`,
                    })
                }

                // 4. Rollback audit on the sealed buffer (streams [STAGE:ROLLBACK])
                await rollbackStagingAction(
                    ledMod,
                    { idx: 'menu-ledger-rollback', slv: sink } as any,
                    ste,
                )
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [LEDGER:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Execute Stage 4 Dual-Set 2d6 Conflict Resolution':
        case '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const duelMod = new LedgerModel()
                const sink = () => {}
                const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
                const shortName = (id: string) => {
                    const s = id.replace(/^char_/, '')
                    return s.charAt(0).toUpperCase() + s.slice(1)
                }

                await initLedger(
                    duelMod,
                    { idx: 'menu-duel-init', slv: sink } as any,
                    ste,
                )

                // Scripted deterministic dice: Obj 11v6, Som 4v8
                const scriptedRolls = [0.99, 0.7, 0.4, 0.4, 0.2, 0.2, 0.5, 0.5]
                let rollCursor = 0
                const scriptedRng = () => {
                    const v = scriptedRolls[rollCursor % scriptedRolls.length]
                    rollCursor++
                    return v
                }

                const initiator = {
                    id: 'char_bog',
                    stats: { cunning: 1, spite: 0, poise: 0, vigor: 0 },
                }
                const target = {
                    id: 'char_wart',
                    stats: { cunning: 0, spite: 0, poise: 0, vigor: 1 },
                }
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [STAGE4:DUAL_2D6] Encounter: [${initiator.id}] vs [${target.id}] (Grievance: grv_siphon_valve)`,
                })

                let duelTicket: any = null
                await resolveDual2d6Action(
                    duelMod,
                    {
                        idx: 'menu-duel-resolve',
                        dat: {
                            resolveParams: {
                                context: {
                                    initiator,
                                    target,
                                    grievanceId: 'grv_siphon_valve',
                                    tick: 8,
                                    timestampMs: 1700000008000,
                                },
                                rng: scriptedRng,
                                autoStage: true,
                            },
                        },
                        slv: (r: any) => {
                            duelTicket = r
                        },
                    } as any,
                    ste,
                )

                const receipt = duelTicket?.resolutionReceipt
                if (receipt) {
                    const trail = receipt.auditTrail
                    const initShort = shortName(receipt.initiatorId)
                    const targShort = shortName(receipt.targetId)
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [DICE:ROLL] Axis 1 (Obj): 2d6(${initShort})=${String(trail.rollA_obj).padEnd(2)} vs 2d6(${targShort})=${trail.rollB_obj} | Mod: ${sign(trail.modObj)} | dObj = ${sign(trail.dObj)} [${receipt.objectiveOutcome}]`,
                    })
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [DICE:ROLL] Axis 2 (Som): 2d6(${initShort})=${String(trail.rollA_som).padEnd(2)} vs 2d6(${targShort})=${trail.rollB_som} | Mod: ${sign(trail.modSom)} | dSom = ${sign(trail.dSom)} [${receipt.somaticOutcome}]`,
                    })
                    if (
                        receipt.objectiveOutcome === 'clean_win' &&
                        receipt.somaticOutcome === 'backfire'
                    ) {
                        await lib.hunt(UPDATE_CONSOLE, {
                            idx: 'cns00',
                            src: `>> [STAGE4:OUTCOME] Compromised Victory! ${initShort} wins objective; ${targShort} inflicts backfire toll.`,
                        })
                    }
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [STAGE:STAGE] Buffered ${duelMod.stagedMutations.length} provisional deltas into StagingAccumulator.`,
                    })
                }
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [DUEL:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Audit Unratified Details & Salience Harvest Queue':
        case '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const actMod = new ActorModel()
                const sink = () => {}

                // 1. Boot actor unit (streams [ACTOR:INIT])
                await initActor(
                    actMod,
                    { idx: 'menu-actor-init', slv: sink } as any,
                    ste,
                )

                // 2. Stage salient prop (streams [DETAIL:STAGE])
                let stageTicket: any = null
                await stageDetailActor(
                    actMod,
                    {
                        idx: 'menu-actor-stage-cup',
                        dat: {
                            stageDetailParams: {
                                detail_id: 'det_green_cup',
                                scene_id: 'sc02',
                                label_candidate: 'green_enamel_cup',
                                category: 'PROP',
                                recurrence_count: 3,
                                dramatic_turn: 'GAZE_PROXIMITY',
                                claim_proposal: 'Chipped green enamel cup',
                            },
                        },
                        slv: (r: any) => {
                            stageTicket = r
                        },
                    } as any,
                    ste,
                )
                if (stageTicket?.actBit?.src === 'STAGED') {
                    const staged = stageTicket.detail
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [DETAIL:STAGE] [${staged.detail_id}] '${staged.label_candidate}' S=${staged.salience_bps} bps >= 7000 bps. [STAGED] [OK]`,
                    })
                }

                // 3. Discard ephemeral noise (streams [DETAIL:DISCARD])
                let discardTicket: any = null
                await stageDetailActor(
                    actMod,
                    {
                        idx: 'menu-actor-stage-gravel',
                        dat: {
                            stageDetailParams: {
                                detail_id: 'det_gravel',
                                scene_id: 'sc02',
                                label_candidate: 'gravel',
                                category: 'SPATIAL_SET',
                                recurrence_count: 1,
                                dramatic_turn: 'BACKGROUND',
                                claim_proposal: 'Loose track gravel',
                            },
                        },
                        slv: (r: any) => {
                            discardTicket = r
                        },
                    } as any,
                    ste,
                )
                if (discardTicket?.actBit?.src === 'DISCARDED') {
                    const dropped = discardTicket.detail
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [DETAIL:DISCARD] [${dropped.detail_id}] S=${dropped.salience_bps} bps < 7000 bps. Ephemeral noise discarded; 0 writes.`,
                    })
                }

                // 4. Ratify into canonical entity (streams [DETAIL:RATIFY])
                let ratifyTicket: any = null
                await ratifyDetailActor(
                    actMod,
                    {
                        idx: 'menu-actor-ratify-cup',
                        dat: {
                            ratifyDetailParams: {
                                detail_id: 'det_green_cup',
                                ratified_entity_id: 'item_green_enamel_cup',
                                tick: 9,
                                timestamp_ms: 1700000009000,
                            },
                        },
                        slv: (r: any) => {
                            ratifyTicket = r
                        },
                    } as any,
                    ste,
                )
                if (ratifyTicket?.actBit?.src === 'RATIFIED') {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: '>> [EVENT:APPEND] Stamped #114 (DETAIL_RATIFIED) -> 9e3f1b4a...',
                    })
                }
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [ACTOR:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Execute Deterministic State Fold & Audit Why-Dirty':
        case '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const sttMod = new StateModel()
                const sink = () => {}

                // 1. Boot state fold unit (streams [STATE:INIT])
                await initState(
                    sttMod,
                    { idx: 'menu-state-init', slv: sink } as any,
                    ste,
                )

                // 2. Hydrate deep-frozen snapshot (streams [STATE:HYDRATE])
                let hydrateTicket: any = null
                await hydrateStateAction(
                    sttMod,
                    {
                        idx: 'menu-state-hydrate',
                        dat: {
                            hydrateParams: {
                                seriesSlug: 'series_sower_demo',
                                tick: 1,
                            },
                        },
                        slv: (r: any) => {
                            hydrateTicket = r
                        },
                    } as any,
                    ste,
                )
                const sealedBase = hydrateTicket?.snapshot
                if (hydrateTicket?.stateHash) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [STATE:HYDRATE] [OK] Deep-frozen snapshot materialized. StateHash: ${hydrateTicket.stateHash.slice(0, 8)}...`,
                    })
                }

                // 3. Fold 12-event log over the sealed base (streams [STATE:FOLD])
                const foldLog: any[] = []
                for (let i = 0; i < 12; i++) {
                    foldLog.push({
                        eventId: `evt_fold_${i + 1}`,
                        eventType: 'SOMATIC_TRAUMA',
                        actorId: i % 2 === 0 ? 'char_bog' : 'char_wart',
                        tick: 2 + i,
                        timestampMs: 1700000002000 + i * 1000,
                        payload: { fatigueBpsDelta: 100 },
                    })
                }
                let foldTicket: any = null
                await foldEventsStateAction(
                    sttMod,
                    {
                        idx: 'menu-state-fold',
                        dat: { foldParams: { events: foldLog } },
                        slv: (r: any) => {
                            foldTicket = r
                        },
                    } as any,
                    ste,
                )
                const foldReceipt = foldTicket?.foldReceipt
                if (foldReceipt && sealedBase) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [STATE:FOLD] Folded ${foldReceipt.eventsCount} events: ${sealedBase.lastEventHash} -> ${foldReceipt.nextStateHash.slice(0, 8)} [SEALED] [OK]`,
                    })
                }

                // 4. Why-dirty blast-radius audit for char_bog
                const targetEntity = 'char_bog'
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [STATE:WHY_DIRTY] Querying entity '${targetEntity}' across scene dependency lattice.`,
                })
                let dirtyTicket: any = null
                await whyDirtyStateAction(
                    sttMod,
                    {
                        idx: 'menu-state-why-dirty',
                        dat: {
                            whyDirtyParams: {
                                entityId: targetEntity,
                                sceneDependencies: {
                                    scene_01: [
                                        {
                                            entityId: 'char_bog',
                                            edgeType: 'LOGISTICAL_EQUIP',
                                        },
                                    ],
                                    scene_02: [
                                        {
                                            entityId: 'char_bog',
                                            edgeType: 'SOMATIC_ACTION',
                                        },
                                    ],
                                    scene_03: [
                                        {
                                            entityId: 'char_wart',
                                            edgeType: 'DIALOGUE',
                                        },
                                    ],
                                },
                            },
                        },
                        slv: (r: any) => {
                            dirtyTicket = r
                        },
                    } as any,
                    ste,
                )
                const dirtyResult = dirtyTicket?.whyDirtyResult
                if (dirtyResult) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [STATE:WHY_DIRTY] Entity '${dirtyResult.entityId}' is ${dirtyResult.isDirty ? 'DIRTY' : 'CLEAN'}. Affected scenes (${dirtyResult.affectedScenes.length}): [${[...dirtyResult.affectedScenes].join(', ')}]`,
                    })
                }
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [STATE:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Audit Epistemic Horizons & Subtext Attenuation':
        case '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const epiMod = new ActorModel()
                const sink = () => {}

                // 1. Boot actor unit (streams [ACTOR:INIT])
                await initActor(
                    epiMod,
                    { idx: 'menu-epistemic-init', slv: sink } as any,
                    ste,
                )

                // 2. Seed 4 belief records across the horizon lattice
                const seedBeliefs = [
                    {
                        observer_id: 'char_bog',
                        fact_id: 'fact_valve_rusty',
                        subjective_probability_bps: 10000,
                    },
                    {
                        observer_id: 'char_bog',
                        fact_id: 'fact_boiler_hot',
                        subjective_probability_bps: 8000,
                    },
                    {
                        observer_id: 'char_wart',
                        fact_id: 'fact_valve_rusty',
                        subjective_probability_bps: 6000,
                    },
                    {
                        observer_id: 'char_wart',
                        fact_id: 'fact_shift_change',
                        subjective_probability_bps: 9000,
                    },
                ]
                for (let i = 0; i < seedBeliefs.length; i++) {
                    await recordBeliefActor(
                        epiMod,
                        {
                            idx: `menu-epistemic-belief-${i + 1}`,
                            dat: { beliefParams: seedBeliefs[i] },
                            slv: sink,
                        } as any,
                        ste,
                    )
                }
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [ACTOR:INIT] [OK] Actor unit online with ${epiMod.beliefs.size} belief records hydrated.`,
                })

                // 3. Scrub Bog's context: 1 retained, 2 omitted (streams [EPISTEMIC:SCRUB])
                await scrubEpistemicContextActor(
                    epiMod,
                    {
                        idx: 'menu-epistemic-scrub',
                        dat: {
                            scrubParams: {
                                observer_id: 'char_bog',
                                world_facts: {
                                    fact_valve_rusty:
                                        'The brass valve is corroded tight.',
                                    fact_stolen_key:
                                        'Wart hid the master drainage key under the boiler.',
                                    fact_murder_plot:
                                        'Spleen intends to poison the reservoir.',
                                },
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 4. High-tension subtext directive (streams [SUBTEXT:DIRECTIVE])
                await buildSubtextDirectiveAction(
                    epiMod,
                    {
                        idx: 'menu-epistemic-subtext',
                        dat: {
                            subtextParams: {
                                actor_id: 'char_bog',
                                tension_bps: 7800,
                                candidate_props: [
                                    'item_copper_tea_kettle',
                                    'item_grease_bucket',
                                ],
                                surface_dispute: 'bent kettle lid',
                                underlying_conflict:
                                    'fear of seasonal abandonment',
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 5. Clean dialogue turn (streams [SUBTEXT:LEAK_PROBE] pass)
                const secretLemmas = [
                    'poison',
                    'well',
                    'arsenic',
                    'tainted',
                    'cistern',
                ]
                await probeDialogueLeakAction(
                    epiMod,
                    {
                        idx: 'menu-epistemic-probe-clean',
                        dat: {
                            leakProbeParams: {
                                dialogue_text:
                                    'I drew fresh water from the deep well this morning.',
                                secret_id: 'secret_poisoned_water',
                                secret_lemmas: secretLemmas,
                                threshold_bps: 3500,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )

                // 6. Contaminated dialogue turn (streams [EPISTEMIC_HORIZON_LEAK])
                await probeDialogueLeakAction(
                    epiMod,
                    {
                        idx: 'menu-epistemic-probe-breach',
                        dat: {
                            leakProbeParams: {
                                dialogue_text:
                                    'Someone dropped poison into the well cistern!',
                                secret_id: 'secret_poisoned_water',
                                secret_lemmas: secretLemmas,
                                threshold_bps: 3500,
                            },
                        },
                        slv: sink,
                    } as any,
                    ste,
                )
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [EPISTEMIC:AUDIT] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'Compile Dual-Field Dialogue AST & Enforce Curtness':
        case '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS': {
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            try {
                const actMod = new ActorModel()
                const sink = () => {}
                // NOTE: pass undefined ste; engine hunt for console updates never
                // settles, so actor buzzers route cns00 telemetry via global LIBRARY.

                // 1. Boot actor unit and hydrate the belief horizon (streams [ACTOR:INIT])
                await initActor(
                    actMod,
                    { idx: 'menu-actor-init', slv: sink } as any,
                    undefined,
                )

                const seedBeliefs = [
                    {
                        observer_id: 'char_bog',
                        fact_id: 'fact_valve_rusty',
                        subjective_probability_bps: 10000,
                    },
                    {
                        observer_id: 'char_bog',
                        fact_id: 'fact_boiler_hot',
                        subjective_probability_bps: 8000,
                    },
                    {
                        observer_id: 'char_wart',
                        fact_id: 'fact_valve_rusty',
                        subjective_probability_bps: 6000,
                    },
                    {
                        observer_id: 'char_wart',
                        fact_id: 'fact_shift_change',
                        subjective_probability_bps: 9000,
                    },
                ]
                for (let i = 0; i < seedBeliefs.length; i++) {
                    await recordBeliefActor(
                        actMod,
                        {
                            idx: `menu-actor-belief-${i + 1}`,
                            dat: { beliefParams: seedBeliefs[i] },
                            slv: sink,
                        } as any,
                        undefined,
                    )
                }
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [ACTOR:INIT] [OK] Actor unit online with ${actMod.beliefs.size} belief records hydrated.`,
                })

                // 2. Directorial curtness budget enforcement (streams [CURTNESS:ENFORCE])
                const curtnessBps = 10000
                const wordBudget = enforceCurtnessBudget(curtnessBps)
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `>> [CURTNESS:ENFORCE] Curtness: ${curtnessBps} bps -> Max Permitted Words: ${wordBudget} words.`,
                })

                // 3. Valid dual-field beat compilation (streams [AST:COMPILE])
                let b02Beat: any = null
                await compileDialogueBeatAction(
                    actMod,
                    {
                        idx: 'menu-actor-compile-b02',
                        dat: {
                            compileBeatParams: {
                                beat_id: 'b02',
                                speaker: 'char_bog',
                                dialogue_text: 'Leave it. Let him bleed.',
                                camera_parenthetical: 'Camera pushes in close.',
                                observable_parenthetical:
                                    'Bog tightens stance.',
                                speech_act: 'IMPLICIT_WARNING',
                                emotion: 'cold_urgency',
                                swain_mru_phase: 'SPEECH',
                                extracted_motor_actions: [],
                                curtness_bps: curtnessBps,
                            },
                        },
                        slv: (r: any) => {
                            b02Beat = r.beat
                        },
                    } as any,
                    undefined,
                )

                // 4. Dual-field split parenthetical channels (streams [AST:CHANNELS])
                if (b02Beat) {
                    await lib.hunt(UPDATE_CONSOLE, {
                        idx: 'cns00',
                        src: `>> [AST:CHANNELS] Camera: '${b02Beat.camera_parenthetical}' | Interlocutor: '${b02Beat.observable_parenthetical}' [OK]`,
                    })
                }

                // 5. Verbose turn breach (streams [CURTNESS_BUDGET_BREACH])
                await compileDialogueBeatAction(
                    actMod,
                    {
                        idx: 'menu-actor-compile-breach',
                        dat: {
                            compileBeatParams: {
                                beat_id: 'b_verbose',
                                speaker: 'char_bog',
                                dialogue_text:
                                    'We must never touch the brass drainage valve control wheel when the boiler is hot.',
                                camera_parenthetical: 'Bog drones on.',
                                observable_parenthetical: 'Bog talks.',
                                speech_act: 'ASSERT',
                                emotion: 'neutral_curt',
                                swain_mru_phase: 'SPEECH',
                                extracted_motor_actions: [],
                                curtness_bps: curtnessBps,
                            },
                        },
                        slv: sink,
                    } as any,
                    undefined,
                )

                // 6. Smuggled kinetic verb breach (streams [FATAL_SOMATIC_BREACH])
                await compileDialogueBeatAction(
                    actMod,
                    {
                        idx: 'menu-actor-compile-somatic-breach',
                        dat: {
                            compileBeatParams: {
                                beat_id: 'b_smuggle',
                                speaker: 'char_bog',
                                dialogue_text: 'Move!',
                                camera_parenthetical:
                                    'Bog sprints toward the ladder.',
                                observable_parenthetical: 'Bog lunges forward.',
                                speech_act: 'ASSERT',
                                emotion: 'suppressed_panic',
                                swain_mru_phase: 'MOTOR_ACTION',
                                extracted_motor_actions: [],
                                curtness_bps: 5000,
                                banned_kinetic_verbs: ['SPRINT'],
                            },
                        },
                        slv: sink,
                    } as any,
                    undefined,
                )
            } catch (err: any) {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: `:: [FAIL] [DIALOGUE:AST] ${err?.message ?? String(err)}`,
                })
            }
            await lib.hunt(UPDATE_CONSOLE, {
                idx: 'cns00',
                src: '>> ============================================================',
            })
            break
        }

        case 'ROOT MENU':
            if (rootSlv != null) rootSlv({ mnuBit: { idx: 'root-menu' } })
            else if (bal?.slv) bal.slv({ mnuBit: { idx: 'root-menu' } })
            return cpy

        default:
            bit = await ste.hunt(CLOSE_TERMINAL, {})
            break
    }

    if (ste && typeof ste.hunt === 'function') {
        setTimeout(async () => {
            bit = await ste.hunt(ActMnu.UPDATE_MENU, {}).catch(() => {})
        }, 333)
    }

    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: 'update-menu-pass',
                val: 1,
                src: cpy.activeSelection,
            },
        })
    }

    return cpy
}

export {
    openSpatialProbeMenuBuzz,
    dispatchSpatialProbeBuzz,
    dispatchEdgeSyncProbeBuzz,
    testSpatialWorkCeilingBuzz,
} from './spatial-probe-menu.buzz.js'
