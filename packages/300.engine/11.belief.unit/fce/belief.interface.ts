/**
 * 11.belief.unit - Belief Record & Epistemic Horizon Contracts
 * Decoupled subjective character knowledge and causal provenance graphs.
 */
import type Model from '../../99.core/interface/model.interface.js'

export type EpistemicHorizon =
    | 'TOTAL_IGNORANCE'
    | 'RUMOR_ONLY'
    | 'FALSE_BELIEF'
    | 'PARTIAL_FACT'
    | 'WITHHELD'
    | 'FACTUAL_WITNESS'

export type BeliefSourceType =
    | 'DIRECT_OBSERVATION'
    | 'TESTIMONY'
    | 'INFERENCE'
    | 'RUMOR'

export interface BeliefRecord {
    readonly belief_id: string
    readonly holder_id: string // The character mind
    readonly subject_id: string // Target entity (e.g., "char_spleen")
    readonly predicate: string // Relation or verb (e.g., "struck")
    readonly object_id: string // Affected entity or prop (e.g., "item_siphon")
    readonly proposition_slug: string // Foreign key mapping to World Fact ID
    readonly subjective_confidence_bp: number // Fixed-point integer: 0 to 10000 bps
    readonly source_type: BeliefSourceType
    readonly source_event_id: string // Historical event log pointer
    readonly parent_belief_id: string | null // Causal transmission pointer
    readonly hop_count: number // Transmission distance from origin (0 = eyewitness)
    readonly resists_correction: boolean // Trait blocking revision
    readonly receipt_hash: string // 64-char SHA-256 cryptographic spatial receipt
}

export interface BeliefModelDescriptor extends Model {
    idx: string
    beliefsByHolder: Map<string, Map<string, BeliefRecord>> // holderId -> propositionSlug -> BeliefRecord
    totalBeliefsRecorded: number
}

export default interface Belief extends BeliefModelDescriptor {}
