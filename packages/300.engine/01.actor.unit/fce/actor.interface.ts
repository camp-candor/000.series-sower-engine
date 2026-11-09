/**
 * 01.actor.unit - Actor Interface Contracts
 * Epistemic Belief Horizon, Unratified Detail Quarantine,
 * Stage 5 Epistemic Context Scrubbing, Subtext Attenuation, and Leak Probing.
 */

export type BeliefSourceType = 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION'

export interface ActorBeliefRecord {
    readonly belief_id: string // Format: `${observer_id}->${fact_id}`
    readonly observer_id: string
    readonly fact_id: string
    readonly subjective_probability_bps: number // [0, 10000] basis points
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
    | 'BACKGROUND' // D_turn = 0 bps
    | 'GAZE_PROXIMITY' // D_turn = 5000 bps
    | 'MECHANICAL_DUEL' // D_turn = 10000 bps

export interface UnratifiedDetailRecord {
    readonly detail_id: string
    readonly scene_id: string
    readonly entity_id?: string
    readonly label_candidate: string
    readonly category: DetailCategory
    readonly recurrence_count: number // Non-negative integer
    readonly dramatic_turn: DramaticTurnLevel
    readonly salience_bps: number // [0, 10000] basis points (Harvest threshold >= 7000 bps)
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
    readonly isHarvestEligible: boolean // true if salience_bps >= 7000
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

// ============================================================================
// STAGE 5 EPISTEMIC CONTEXT SCRUBBING & SUBTEXT ATTENUATION CONTRACTS
// ============================================================================

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
    readonly tension_bps: number // [0, 10000]
    readonly candidate_props: readonly string[]
    readonly surface_dispute: string
    readonly underlying_conflict: string
}

export interface DialogueLeakProbeParams {
    readonly dialogue_text: string
    readonly secret_id: string
    readonly secret_lemmas: readonly string[]
    readonly threshold_bps?: number // Default: 3500 bps (0.35 similarity)
}

export interface DialogueLeakProbeReceipt {
    readonly passed: boolean
    readonly secret_id: string
    readonly overlap_count: number
    readonly total_lemmas: number
    readonly similarity_bps: number // [0, 10000]
    readonly matched_tokens: readonly string[]
    readonly error?: string
}

export default interface Actor {
    idx: string
    beliefs: Map<string, ActorBeliefRecord>
    details: Map<string, UnratifiedDetailRecord>
}
