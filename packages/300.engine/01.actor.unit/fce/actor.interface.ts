/**
 * 01.actor.unit - Epistemic Vector & Unratified Detail Quarantine
 * Invariant: Belief probabilities and detail salience are integer basis points in [0, 10000].
 */
export type BeliefSourceType = 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION'

export interface ActorBeliefRecord {
    belief_id: string // observer_id->fact_id
    observer_id: string
    fact_id: string
    subjective_probability_bps: number // 0 to 10,000 basis points
    source_type: BeliefSourceType
    is_false_belief: number // 0 or 1
    learned_at_ms: number
    updated_at_ms: number
}

export type DetailStatus = 'STAGED' | 'DISCARDED' | 'RATIFIED'

export interface UnratifiedDetailRecord {
    detail_id: string
    scene_id: string
    entity_id?: string
    salience_bps: number // 0 to 10,000 basis points (tracking threshold: >= 7000 bps)
    claim_proposal: string
    status: DetailStatus
    created_at_ms: number
    reviewed_at_ms?: number
}

export default interface Actor {
    idx: string
    beliefs: Record<string, ActorBeliefRecord> // Keyed by belief_id (observer_id->fact_id)
    details: Record<string, UnratifiedDetailRecord> // Keyed by detail_id
}
