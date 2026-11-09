/**
 * 01.actor.unit - Actor Buzz Business Logic
 * Epistemic Belief Horizon, Unratified Detail Harvest Queue,
 * Subtext Attenuation, and Stage 5 Dual-Field Dialogue AST Compilation.
 */
import { ActorModel } from '../actor.model.js'
import type ActorBit from '../fce/actor.bit.js'
import type {
    ActorBeliefRecord,
    UnratifiedDetailRecord,
    CalculateSalienceParams,
    SalienceCalculationReceipt,
    DramaticTurnLevel,
    BuildSubtextParams,
    SubtextAttenuationDirective,
    DialogueLeakProbeParams,
    DialogueLeakProbeReceipt,
    DialogueBeatAST,
    CompileDialogueBeatParams,
    CompileDialogueBeatReceipt,
} from '../fce/actor.interface.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActEvt from '../../05.event.unit/event.action.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export function assertBasisPoints(val: number, field: string): void {
    if (!Number.isInteger(val)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] ${field} must be a discrete integer. Received: ${val}`,
        )
    }
    if (val < 0 || val > 10000) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${field} out of bounds [0, 10000]: ${val}`,
        )
    }
}

export function makeBeliefId(observerId: string, factId: string): string {
    return `${observerId}->${factId}`
}

export function calculateCompositeSalience(
    params: CalculateSalienceParams,
): SalienceCalculationReceipt {
    const { recurrence_count, dramatic_turn } = params

    if (!Number.isInteger(recurrence_count)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] recurrence_count must be a discrete integer. Received: ${recurrence_count}`,
        )
    }

    const normalizedRecurrenceBps = Math.min(
        10000,
        Math.floor((recurrence_count * 10000) / 3),
    )
    const recurrence_component_bps = Math.floor(
        (4000 * normalizedRecurrenceBps) / 10000,
    )

    let dTurnBps = 0
    if (dramatic_turn === 'MECHANICAL_DUEL') {
        dTurnBps = 10000
    } else if (dramatic_turn === 'GAZE_PROXIMITY') {
        dTurnBps = 5000
    } else {
        dTurnBps = 0
    }

    const dramatic_component_bps = Math.floor((6000 * dTurnBps) / 10000)
    const salience_bps = Math.min(
        10000,
        recurrence_component_bps + dramatic_component_bps,
    )

    return {
        recurrence_count,
        dramatic_turn,
        recurrence_component_bps,
        dramatic_component_bps,
        salience_bps,
        isHarvestEligible: salience_bps >= 7000,
    }
}

export function buildSubtextAttenuationDirective(
    params: BuildSubtextParams,
): SubtextAttenuationDirective {
    const {
        tension_bps,
        candidate_props,
        surface_dispute,
        underlying_conflict,
    } = params
    assertBasisPoints(tension_bps, 'tension_bps')

    const anchor =
        candidate_props.length > 0 ? candidate_props[0] : 'grease_bucket'

    if (tension_bps >= 7000) {
        return {
            directive_type: 'FALSE_INTERPRETATION_ANCHOR',
            anchor_prop: anchor,
            overt_topic: surface_dispute,
            suppressed_emotion: underlying_conflict,
            tension_bps,
            guidance_prompt: `Argue violently about '${surface_dispute}' focusing obsessively on '${anchor}'. Suppress any mention of '${underlying_conflict}'.`,
        }
    }

    return {
        directive_type: 'DIRECT_EXPRESSION',
        anchor_prop: anchor,
        overt_topic: surface_dispute,
        suppressed_emotion: '',
        tension_bps,
        guidance_prompt: `Discuss '${surface_dispute}' directly. Tension is calm.`,
    }
}

export function probeDialogueSubtextLeak(
    params: DialogueLeakProbeParams,
): DialogueLeakProbeReceipt {
    const { dialogue_text, secret_id, secret_lemmas } = params
    const threshold_bps = params.threshold_bps ?? 3500
    assertBasisPoints(threshold_bps, 'threshold_bps')

    if (secret_lemmas.length === 0) {
        return {
            passed: true,
            secret_id,
            overlap_count: 0,
            total_lemmas: 0,
            similarity_bps: 0,
            matched_tokens: Object.freeze([]),
        }
    }

    const normalizedWords = dialogue_text
        .toLowerCase()
        .replace(/[^a-z0-9_\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 0)

    const dialogueWordSet = new Set(normalizedWords)
    const matchedTokens: string[] = []

    for (const lemma of secret_lemmas) {
        const cleanLemma = lemma.toLowerCase().trim()
        if (dialogueWordSet.has(cleanLemma)) {
            matchedTokens.push(cleanLemma)
        }
    }

    const overlap_count = matchedTokens.length
    const total_lemmas = secret_lemmas.length
    const similarity_bps = Math.min(
        10000,
        Math.floor((overlap_count * 10000) / total_lemmas),
    )

    const passed = similarity_bps <= threshold_bps
    const error = passed
        ? undefined
        : `[EPISTEMIC_HORIZON_LEAK] Dialogue leaked secret '${secret_id}' (Similarity: ${similarity_bps} bps > ${threshold_bps} bps)`

    return {
        passed,
        secret_id,
        overlap_count,
        total_lemmas,
        similarity_bps,
        matched_tokens: Object.freeze(matchedTokens),
        error,
    }
}

// ============================================================================
// STAGE 5 DUAL-FIELD DIALOGUE AST COMPILATION HELPERS
// ============================================================================

export function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
}

export function enforceCurtnessBudget(curtness_bps: number): number {
    assertBasisPoints(curtness_bps, 'curtness_bps')
    // W_max = max(2, floor(24 - (18 * C) / 10000))
    const wordCap = Math.floor(24 - (18 * curtness_bps) / 10000)
    return Math.max(2, wordCap)
}

export function compileDialogueBeat(
    params: CompileDialogueBeatParams,
): CompileDialogueBeatReceipt {
    const {
        beat_id,
        speaker,
        dialogue_text,
        camera_parenthetical,
        observable_parenthetical,
        speech_act,
        emotion,
        swain_mru_phase,
        extracted_motor_actions,
        arms_required = 1,
        curtness_bps,
        banned_kinetic_verbs = [],
    } = params

    // 1. Directorial Curtness Budget Enforcement
    const max_permitted_words = enforceCurtnessBudget(curtness_bps)
    const word_count = countWords(dialogue_text)

    if (word_count > max_permitted_words) {
        return {
            compiled: false,
            word_count,
            max_permitted_words,
            curtness_breach: true,
            error: `[CURTNESS_BUDGET_BREACH] Dialogue text length (${word_count} words) exceeds curtness budget (${max_permitted_words} words)`,
        }
    }

    // 2. Dual-Field Motor Discrepancy Gate
    // Sweep prose channels for kinetic verbs
    const proseText =
        `${camera_parenthetical} ${observable_parenthetical}`.toUpperCase()
    const bannedSet = new Set(banned_kinetic_verbs.map((v) => v.toUpperCase()))

    for (const action of extracted_motor_actions) {
        if (bannedSet.has(action.toUpperCase())) {
            return {
                compiled: false,
                word_count,
                max_permitted_words,
                somatic_breach: true,
                error: `[FATAL_SOMATIC_BREACH] Speaker '${speaker}' attempted banned motor action: ${action}`,
            }
        }
    }

    for (const banned of bannedSet) {
        if (proseText.includes(banned)) {
            return {
                compiled: false,
                word_count,
                max_permitted_words,
                somatic_breach: true,
                error: `[FATAL_SOMATIC_BREACH] Speaker '${speaker}' smuggled banned kinetic verb '${banned}' in parenthetical`,
            }
        }
    }

    const beat: DialogueBeatAST = {
        beat_id,
        speaker,
        dialogue_text,
        camera_parenthetical,
        observable_parenthetical,
        speech_act,
        emotion,
        swain_mru_phase,
        extracted_motor_actions: Object.freeze([...extracted_motor_actions]),
        capabilities_used: Object.freeze({
            arms_required,
        }),
        word_count,
        max_permitted_words,
    }

    return {
        compiled: true,
        beat,
        word_count,
        max_permitted_words,
    }
}

export const initActor = async (
    cpy: ActorModel,
    bal?: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    cpy.beliefs.clear()
    cpy.details.clear()
    cpy.compiledBeats.clear()

    if (ste && typeof ste.hunt === 'function') {
        const queryRes: any = await ste.hunt(ActDbs.QUERY_DATABASE, {
            dat: { table: 'unratified_details' },
        })
        if (queryRes?.databaseBit?.dat?.records) {
            for (const r of queryRes.databaseBit.dat.records) {
                cpy.details.set(r.detail_id, r)
            }
        }
    }

    await emitConsole(
        ste,
        `>> [ACTOR:INIT] [OK] Actor unit online with ${cpy.details.size} quarantined details hydrated.`,
    )

    if (bal?.slv) {
        bal.slv({
            actBit: {
                idx: 'init-actor-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateActor = (
    cpy: ActorModel,
    bal?: ActorBit,
    _ste?: State,
): ActorModel => {
    if (bal?.slv) {
        bal.slv({
            actBit: {
                idx: 'update-actor-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const recordBeliefActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const raw: any = bal.dat?.beliefParams || bal.dat || {}
    const observer_id: string = raw.observer_id || bal.src || ''
    const fact_id: string = raw.fact_id || ''
    const prob: number = raw.subjective_probability_bps ?? 10000
    const nowMs: number = raw.timestamp_ms || 1700000000000

    if (!observer_id || !fact_id) {
        const err = '[INVALID_BELIEF_PARAMS] Missing observer_id or fact_id'
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'record-belief-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        assertBasisPoints(prob, 'subjective_probability_bps')
        const belief_id = makeBeliefId(observer_id, fact_id)
        const isFalse = raw.is_false_belief ? 1 : 0

        const record: ActorBeliefRecord = {
            belief_id,
            observer_id,
            fact_id,
            subjective_probability_bps: prob,
            source_type: raw.source_type || 'DIRECT_OBSERVATION',
            is_false_belief: isFalse,
            learned_at_ms: nowMs,
            updated_at_ms: nowMs,
        }

        cpy.beliefs.set(belief_id, record)

        await emitConsole(
            ste,
            `>> [ACTOR:BELIEF] [${belief_id}] Registered prob: ${prob} bps | Source: [${record.source_type}]`,
        )

        if (bal.slv) {
            bal.slv({
                belief: record,
                actBit: {
                    idx: 'record-belief-pass',
                    val: prob,
                    dat: { belief: record },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(
            ste,
            `:: [FAIL] Belief registration failed: ${errorMsg}`,
        )
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'record-belief-fail',
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const queryHorizonActor = (
    cpy: ActorModel,
    bal: ActorBit,
    _ste?: State,
): ActorModel => {
    const observerId = bal.dat?.observerId || bal.src
    const list: ActorBeliefRecord[] = []

    for (const b of cpy.beliefs.values()) {
        if (!observerId || b.observer_id === observerId) {
            if (b.subjective_probability_bps > 0) {
                list.push(b)
            }
        }
    }

    if (bal.slv) {
        bal.slv({
            beliefs: list,
            actBit: {
                idx: 'query-horizon-pass',
                val: list.length,
                dat: { beliefs: list, rowCount: list.length },
                lst: list,
            },
        })
    }
    return cpy
}

export const scrubEpistemicContextActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const raw: any = bal.dat?.scrubParams || bal.dat || {}
    const observerId: string = raw.observer_id || bal.src || ''
    const facts: Record<string, string> = raw.world_facts || {}

    const scrubbed: Record<string, string> = {}
    let omittedCount = 0

    for (const [factKey, factValue] of Object.entries(facts)) {
        const beliefId = makeBeliefId(observerId, factKey)
        const b = cpy.beliefs.get(beliefId)
        if (b && b.subjective_probability_bps > 0) {
            scrubbed[factKey] = factValue
        } else {
            omittedCount++
        }
    }

    await emitConsole(
        ste,
        `>> [EPISTEMIC:SCRUB] Scrubbed context for '${observerId}'. Retained: ${Object.keys(scrubbed).length} facts | Omitted: ${omittedCount} unobserved facts [OK]`,
    )

    if (bal.slv) {
        bal.slv({
            scrubbedFacts: scrubbed,
            actBit: {
                idx: 'scrub-context-pass',
                val: Object.keys(scrubbed).length,
                dat: { scrubbedFacts: scrubbed },
            },
        })
    }
    return cpy
}

export const buildSubtextDirectiveAction = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const params: BuildSubtextParams | undefined = bal.dat?.subtextParams
    if (!params || !params.actor_id) {
        const err = '[INVALID_SUBTEXT_PARAMS] Missing actor_id or subtextParams'
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'build-subtext-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        const directive = buildSubtextAttenuationDirective(params)

        await emitConsole(
            ste,
            `>> [SUBTEXT:DIRECTIVE] [${params.actor_id}] Directive: [${directive.directive_type}] | Anchor: '${directive.anchor_prop}' | Tension: ${directive.tension_bps} bps [OK]`,
        )

        if (bal.slv) {
            bal.slv({
                subtextDirective: directive,
                actBit: {
                    idx: 'build-subtext-pass',
                    val: directive.tension_bps,
                    src: directive.directive_type,
                    dat: { subtextDirective: directive },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(
            ste,
            `:: [FAIL] Subtext directive build failed: ${errorMsg}`,
        )
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'build-subtext-fail',
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const probeDialogueLeakAction = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const params: DialogueLeakProbeParams | undefined = bal.dat?.leakProbeParams
    if (!params || !params.dialogue_text || !params.secret_id) {
        const err = '[INVALID_PROBE_PARAMS] Missing dialogue_text or secret_id'
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'probe-leak-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        const receipt = probeDialogueSubtextLeak(params)

        if (!receipt.passed) {
            await emitConsole(
                ste,
                `:: [FAIL] [EPISTEMIC_HORIZON_LEAK] Secret '${params.secret_id}' leaked! Sim: ${receipt.similarity_bps} bps > 3500 bps | Tokens: [${receipt.matched_tokens.join(', ')}]`,
            )
            if (bal.slv) {
                bal.slv({
                    leakProbeReceipt: receipt,
                    actBit: {
                        idx: 'probe-leak-breach',
                        val: -1,
                        src: '[EPISTEMIC_HORIZON_LEAK]',
                        dat: {
                            leakProbeReceipt: receipt,
                            error: receipt.error,
                        },
                    },
                })
            }
            return cpy
        }

        await emitConsole(
            ste,
            `>> [SUBTEXT:LEAK_PROBE] Clean. Secret '${params.secret_id}' uncompromised (Sim: ${receipt.similarity_bps} bps <= 3500 bps) [OK]`,
        )

        if (bal.slv) {
            bal.slv({
                leakProbeReceipt: receipt,
                actBit: {
                    idx: 'probe-leak-pass',
                    val: receipt.similarity_bps,
                    src: '[OK]',
                    dat: { leakProbeReceipt: receipt },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(
            ste,
            `:: [FAIL] Subtext leak probe failed: ${errorMsg}`,
        )
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'probe-leak-fail',
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const compileDialogueBeatAction = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const params: CompileDialogueBeatParams | undefined =
        bal.dat?.compileBeatParams
    if (!params || !params.beat_id || !params.speaker) {
        const err = '[INVALID_COMPILE_PARAMS] Missing beat_id or speaker'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'compile-beat-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        const receipt = compileDialogueBeat(params)

        if (!receipt.compiled || !receipt.beat) {
            const err = receipt.error || '[COMPILE_FAILED]'
            await emitConsole(ste, `:: [FAIL] ${err}`)
            if (bal.slv) {
                bal.slv({
                    compileBeatReceipt: receipt,
                    actBit: {
                        idx: receipt.somatic_breach
                            ? 'compile-beat-somatic-breach'
                            : 'compile-beat-curtness-breach',
                        val: -1,
                        src: receipt.somatic_breach
                            ? '[FATAL_SOMATIC_BREACH]'
                            : '[CURTNESS_BUDGET_BREACH]',
                        dat: { compileBeatReceipt: receipt, error: err },
                    },
                })
            }
            return cpy
        }

        cpy.compiledBeats.set(receipt.beat.beat_id, receipt.beat)

        await emitConsole(
            ste,
            `>> [AST:COMPILE] [${receipt.beat.beat_id}] (${receipt.beat.speaker}) | Words: ${receipt.word_count}/${receipt.max_permitted_words} | Act: [${receipt.beat.speech_act}] [OK]`,
        )

        if (bal.slv) {
            bal.slv({
                beat: receipt.beat,
                compileBeatReceipt: receipt,
                actBit: {
                    idx: 'compile-beat-pass',
                    val: receipt.word_count,
                    src: '[OK]',
                    dat: { beat: receipt.beat, compileBeatReceipt: receipt },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Beat compilation failed: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'compile-beat-fail',
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const enforceCurtnessBudgetAction = (
    cpy: ActorModel,
    bal: ActorBit,
    _ste?: State,
): ActorModel => {
    const curtness = bal.dat?.curtnessLimit ?? 5000

    try {
        const cap = enforceCurtnessBudget(curtness)
        if (bal.slv) {
            bal.slv({
                curtnessLimit: cap,
                actBit: {
                    idx: 'enforce-curtness-pass',
                    val: cap,
                    dat: { curtnessLimit: cap },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'enforce-curtness-fail',
                    val: -1,
                    dat: { error: err.message },
                },
            })
        }
    }

    return cpy
}

export const calculateSalienceActor = (
    cpy: ActorModel,
    bal: ActorBit,
    _ste?: State,
): ActorModel => {
    const raw: any = bal.dat?.salienceParams || bal.dat || {}
    const recCount = raw.recurrence_count ?? 1
    const turn: DramaticTurnLevel = raw.dramatic_turn || 'BACKGROUND'

    try {
        const receipt = calculateCompositeSalience({
            recurrence_count: recCount,
            dramatic_turn: turn,
        })

        if (bal.slv) {
            bal.slv({
                salienceReceipt: receipt,
                actBit: {
                    idx: 'calculate-salience-pass',
                    val: receipt.salience_bps,
                    src: receipt.isHarvestEligible
                        ? 'HARVEST_ELIGIBLE'
                        : 'EPHEMERAL_NOISE',
                    dat: { salienceReceipt: receipt },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'calculate-salience-fail',
                    val: -1,
                    dat: { error: err.message },
                },
            })
        }
    }

    return cpy
}

export const stageDetailActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const raw: any = bal.dat?.stageDetailParams || bal.dat || {}
    const detail_id: string = raw.detail_id || bal.src || ''
    const scene_id: string = raw.scene_id || 'sc01'
    const label_candidate: string = raw.label_candidate || 'unnamed_detail'
    const category = raw.category || 'PROP'
    const recurrence_count = raw.recurrence_count ?? 1
    const dramatic_turn: DramaticTurnLevel = raw.dramatic_turn || 'BACKGROUND'
    const claim_proposal: string = raw.claim_proposal || ''
    const nowMs: number = raw.timestamp_ms || 1700000000000

    if (!detail_id || !claim_proposal) {
        const err =
            '[INVALID_DETAIL_PARAMS] Missing detail_id or claim_proposal'
        await emitConsole(ste, `:: [FAIL] ${err}`)
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'stage-detail-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    try {
        const receipt = calculateCompositeSalience({
            recurrence_count,
            dramatic_turn,
        })

        if (!receipt.isHarvestEligible) {
            await emitConsole(
                ste,
                `>> [DETAIL:DISCARD] [${detail_id}] S=${receipt.salience_bps} bps < 7000 bps. Ephemeral noise discarded; 0 ledger writes.`,
            )

            const discardedRec: UnratifiedDetailRecord = {
                detail_id,
                scene_id,
                entity_id: raw.entity_id,
                label_candidate,
                category,
                recurrence_count,
                dramatic_turn,
                salience_bps: receipt.salience_bps,
                claim_proposal,
                status: 'DISCARDED',
                created_at_ms: nowMs,
                reviewed_at_ms: nowMs,
            }

            if (bal.slv) {
                bal.slv({
                    detail: discardedRec,
                    actBit: {
                        idx: 'stage-detail-discarded',
                        val: 0,
                        src: 'DISCARDED',
                        dat: { detail: discardedRec },
                    },
                })
            }
            return cpy
        }

        const stagedRec: UnratifiedDetailRecord = {
            detail_id,
            scene_id,
            entity_id: raw.entity_id,
            label_candidate,
            category,
            recurrence_count,
            dramatic_turn,
            salience_bps: receipt.salience_bps,
            claim_proposal,
            status: 'STAGED',
            created_at_ms: nowMs,
        }

        cpy.details.set(detail_id, stagedRec)

        if (ste && typeof ste.hunt === 'function') {
            await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
                dat: {
                    operations: [
                        {
                            table: 'unratified_details',
                            action: 'INSERT',
                            key: detail_id,
                            record: stagedRec,
                        },
                    ],
                },
            })
        }

        await emitConsole(
            ste,
            `>> [DETAIL:STAGE] [${detail_id}] '${label_candidate}' S=${receipt.salience_bps} bps >= 7000 bps. Trapped behind Quarantine Fence [STAGED] [OK]`,
        )

        if (bal.slv) {
            bal.slv({
                detail: stagedRec,
                actBit: {
                    idx: 'stage-detail-pass',
                    val: receipt.salience_bps,
                    src: 'STAGED',
                    dat: { detail: stagedRec },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Detail staging rejected: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'stage-detail-fail',
                    val: -1,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const ratifyDetailActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const raw: any = bal.dat?.ratifyDetailParams || bal.dat || {}
    const detail_id = raw.detail_id || bal.src
    const ratified_id = raw.ratified_entity_id
    const nowMs = raw.timestamp_ms || 1700000000000
    const tick = raw.tick || 1

    const existing = cpy.details.get(detail_id)
    if (!existing) {
        const err = `[DETAIL_NOT_FOUND] Detail '${detail_id}' not found in harvest queue`
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'ratify-detail-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    if (!ratified_id) {
        const err =
            '[MISSING_CANON_ID] ratified_entity_id required for promotion'
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'ratify-detail-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const updated: UnratifiedDetailRecord = {
        ...existing,
        status: 'RATIFIED',
        ratified_entity_id: ratified_id,
        reviewed_at_ms: nowMs,
    }

    cpy.details.set(detail_id, updated)

    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'unratified_details',
                        action: 'UPDATE',
                        key: detail_id,
                        record: updated,
                    },
                ],
            },
        })

        await ste.hunt(ActEvt.APPEND_EVENT, {
            dat: {
                appendParams: {
                    eventId: `evt_ratify_${detail_id}_${tick}`,
                    eventType: 'DETAIL_RATIFIED',
                    tick,
                    payload: {
                        detail_id,
                        ratified_entity_id: ratified_id,
                        claim_proposal: existing.claim_proposal,
                        salience_bps: existing.salience_bps,
                    },
                },
            },
        })
    }

    await emitConsole(
        ste,
        `>> [DETAIL:RATIFY] [${detail_id}] Promoted to Canonical Entity '${ratified_id}' [RATIFIED] [SEALED]`,
    )

    if (bal.slv) {
        bal.slv({
            detail: updated,
            actBit: {
                idx: 'ratify-detail-pass',
                val: 1,
                src: 'RATIFIED',
                dat: { detail: updated },
            },
        })
    }

    return cpy
}

export const discardDetailActor = async (
    cpy: ActorModel,
    bal: ActorBit,
    ste?: State,
): Promise<ActorModel> => {
    const raw: any = bal.dat?.discardDetailParams || bal.dat || {}
    const detail_id = raw.detail_id || bal.src
    const nowMs = raw.timestamp_ms || 1700000000000

    const existing = cpy.details.get(detail_id)
    if (!existing) {
        const err = `[DETAIL_NOT_FOUND] Detail '${detail_id}' not found`
        if (bal.slv) {
            bal.slv({
                actBit: {
                    idx: 'discard-detail-fail',
                    val: -1,
                    dat: { error: err },
                },
            })
        }
        return cpy
    }

    const updated: UnratifiedDetailRecord = {
        ...existing,
        status: 'DISCARDED',
        reviewed_at_ms: nowMs,
    }

    cpy.details.set(detail_id, updated)

    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(ActDbs.EXEC_BATCH_DATABASE, {
            dat: {
                operations: [
                    {
                        table: 'unratified_details',
                        action: 'UPDATE',
                        key: detail_id,
                        record: updated,
                    },
                ],
            },
        })
    }

    await emitConsole(
        ste,
        `>> [DETAIL:DISCARD] [${detail_id}] Purged from active harvest queue [DISCARDED]`,
    )

    if (bal.slv) {
        bal.slv({
            detail: updated,
            actBit: {
                idx: 'discard-detail-pass',
                val: 0,
                src: 'DISCARDED',
                dat: { detail: updated },
            },
        })
    }

    return cpy
}

export const listUnratifiedDetailsActor = (
    cpy: ActorModel,
    bal: ActorBit,
    _ste?: State,
): ActorModel => {
    const filter = bal.dat?.filterStatus
    const list: UnratifiedDetailRecord[] = []

    for (const d of cpy.details.values()) {
        if (!filter || d.status === filter) {
            list.push(d)
        }
    }

    if (bal.slv) {
        bal.slv({
            details: list,
            actBit: {
                idx: 'list-details-pass',
                val: list.length,
                dat: { details: list, rowCount: list.length },
                lst: list,
            },
        })
    }
    return cpy
}
