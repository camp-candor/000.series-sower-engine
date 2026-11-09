/**
 * 01.actor.unit - Actor Interface Contracts
 * Epistemic Belief Horizon, Unratified Detail Quarantine, Subtext Attenuation,
 * and Stage 5 Dual-Field Dialogue AST Compilation with Curtness Budget Gating.
 */

export type BeliefSourceType = 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION'

export interface ActorBeliefRecord {
    readonly belief_id: string
    readonly observer_id: string
    readonly fact_id: string
    readonly subjective_probability_bps: number // [0, 10000]
    readonly source_type: BeliefSourceType
    readonly is_false_belief: number // 0 or 1
    readonly learned_at_ms: number
    readonly updated_at_ms: number
}

export type DetailStatus = 'STAGED' | 'DISCARDED' | 'RATIFIED'

export type DetailCategory =
    | 'PROP'
    | 'SOMATIC_TIC'
    | 'SPATIAL_SET'
    | 'VOCAL_CADENCE'
    | 'COSTUME_DECAY'

export type DramaticTurnLevel =
    | 'BACKGROUND'
    | 'GAZE_PROXIMITY'
    | 'MECHANICAL_DUEL'

export interface UnratifiedDetailRecord {
    readonly detail_id: string
    readonly scene_id: string
    readonly entity_id?: string
    readonly label_candidate: string
    readonly category: DetailCategory
    readonly recurrence_count: number
    readonly dramatic_turn: DramaticTurnLevel
    readonly salience_bps: number // [0, 10000]
    readonly claim_proposal: string
    readonly status: DetailStatus
    readonly ratified_entity_id?: string
    readonly created_at_ms: number
    readonly reviewed_at_ms?: number
}

export interface CalculateSalienceParams {
    readonly recurrence_count: number
    readonly dramatic_turn: DramaticTurnLevel
}

export interface SalienceCalculationReceipt {
    readonly recurrence_count: number
    readonly dramatic_turn: DramaticTurnLevel
    readonly recurrence_component_bps: number
    readonly dramatic_component_bps: number
    readonly salience_bps: number
    readonly isHarvestEligible: boolean
}

export interface RecordBeliefParams {
    readonly observer_id: string
    readonly fact_id: string
    readonly subjective_probability_bps: number
    readonly source_type?: BeliefSourceType
    readonly is_false_belief?: boolean | number
    readonly timestamp_ms?: number
}

export interface ScrubContextParams {
    readonly observer_id: string
    readonly world_facts: Readonly<Record<string, string>>
}

export interface StageDetailParams {
    readonly detail_id: string
    readonly scene_id: string
    readonly entity_id?: string
    readonly label_candidate: string
    readonly category: DetailCategory
    readonly recurrence_count?: number
    readonly dramatic_turn?: DramaticTurnLevel
    readonly claim_proposal: string
    readonly timestamp_ms?: number
}

export interface RatifyDetailParams {
    readonly detail_id: string
    readonly ratified_entity_id: string
    readonly tick?: number
    readonly timestamp_ms?: number
}

export interface DiscardDetailParams {
    readonly detail_id: string
    readonly timestamp_ms?: number
}

export interface SubtextAttenuationDirective {
    readonly directive_type: 'FALSE_INTERPRETATION_ANCHOR' | 'DIRECT_EXPRESSION'
    readonly anchor_prop: string
    readonly overt_topic: string
    readonly suppressed_emotion: string
    readonly tension_bps: number
    readonly guidance_prompt: string
}

export interface BuildSubtextParams {
    readonly actor_id: string
    readonly tension_bps: number
    readonly candidate_props: readonly string[]
    readonly surface_dispute: string
    readonly underlying_conflict: string
}

export interface DialogueLeakProbeParams {
    readonly dialogue_text: string
    readonly secret_id: string
    readonly secret_lemmas: readonly string[]
    readonly threshold_bps?: number
}

export interface DialogueLeakProbeReceipt {
    readonly passed: boolean
    readonly secret_id: string
    readonly overlap_count: number
    readonly total_lemmas: number
    readonly similarity_bps: number
    readonly matched_tokens: readonly string[]
    readonly error?: string
}

// ============================================================================
// STAGE 5 DUAL-FIELD DIALOGUE AST COMPILATION CONTRACTS
// ============================================================================

export type SpeechActEnum =
    | 'ASSERT'
    | 'DENY'
    | 'QUESTION'
    | 'WITHHOLD'
    | 'DEFLECT'
    | 'BLUFF'
    | 'IMPLICIT_WARNING'

export type EmotionTag =
    | 'defensive'
    | 'humiliated'
    | 'cold_urgency'
    | 'cynical_defiance'
    | 'suppressed_panic'
    | 'neutral_curt'
    | 'calculated_stall'

export type SwainMRUPhase =
    | 'STIMULUS'
    | 'VISCERAL_REFLEX'
    | 'RATIONAL_ACTION'
    | 'MOTOR_ACTION'
    | 'SPEECH'

export interface DialogueBeatAST {
    readonly beat_id: string
    readonly speaker: string
    readonly dialogue_text: string
    readonly camera_parenthetical: string
    readonly observable_parenthetical: string
    readonly speech_act: SpeechActEnum
    readonly emotion: EmotionTag
    readonly swain_mru_phase: SwainMRUPhase
    readonly extracted_motor_actions: readonly string[]
    readonly capabilities_used: {
        readonly arms_required: number
    }
    readonly word_count: number
    readonly max_permitted_words: number
}

export interface DialogueSceneAST {
    readonly schema_version: string
    readonly compiler_version: string
    readonly episode_id: string
    readonly scene_id: string
    readonly state_snapshot_hash: string
    readonly lines: readonly DialogueBeatAST[]
}

export interface CompileDialogueBeatParams {
    readonly beat_id: string
    readonly speaker: string
    readonly dialogue_text: string
    readonly camera_parenthetical: string
    readonly observable_parenthetical: string
    readonly speech_act: SpeechActEnum
    readonly emotion: EmotionTag
    readonly swain_mru_phase: SwainMRUPhase
    readonly extracted_motor_actions: readonly string[]
    readonly arms_required?: number
    readonly curtness_bps: number // [0, 10000]
    readonly banned_kinetic_verbs?: readonly string[]
    readonly tick?: number
    readonly timestamp_ms?: number
}

export interface CompileDialogueBeatReceipt {
    readonly compiled: boolean
    readonly beat?: DialogueBeatAST
    readonly error?: string
    readonly word_count: number
    readonly max_permitted_words: number
    readonly somatic_breach?: boolean
    readonly curtness_breach?: boolean
}

export default interface Actor {
    idx: string
    beliefs: Map<string, ActorBeliefRecord>
    details: Map<string, UnratifiedDetailRecord>
    compiledBeats: Map<string, DialogueBeatAST>
}
