/**
 * 16.state.unit - Composite Working State Snapshot Contract
 * Strict Invariant: Deep-frozen, immutable representation of the four-vector world truth.
 */

export interface SomaticLiveState {
    readonly entity_id: string
    readonly arms_available: number
    readonly legs_available: number
    readonly locomotion_tier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
    readonly concussion_level: number
    readonly fatigue_bps: number
    readonly pain_bps: number
    readonly refusal_strain_bps: number
    readonly open_wounds: readonly string[]
    readonly banned_kinetic_verbs: readonly string[]
}

export interface LogisticalLiveState {
    readonly entity_id: string
    readonly held_items: readonly string[]
    readonly worn_gear: Readonly<Record<string, string>>
    readonly slung_items: readonly string[]
    readonly cached_items: readonly string[]
}

export interface SpatialLiveState {
    readonly entity_id: string
    readonly location_id: string
    readonly q: number
    readonly r: number
}

export interface CompositeEntityLiveRecord
    extends SomaticLiveState, LogisticalLiveState, SpatialLiveState {
    readonly updated_at_ms: number
}

export interface StringsLedgerRecord {
    readonly relation_id: string
    readonly holder_id: string
    readonly debtor_id: string
    readonly weight_bps: number
    readonly strings_count: number
    readonly updated_at_ms: number
}

export interface GrievanceStatusRecord {
    readonly grievance_id: string
    readonly instigator_id: string
    readonly victim_id: string
    readonly escalation_depth: number
    readonly cooldown_cycles: number
    readonly intensity_bps: number
    readonly status: 'DORMANT' | 'ACTIVE' | 'SIMMERING' | 'RESOLVED'
    readonly updated_at_ms: number
}

export interface ParanoiaClockRecord {
    readonly clock_id: string
    readonly entity_id: string
    readonly clock_name: string
    readonly value_bps: number
    readonly threshold_bps: number
    readonly decay_rate_bps: number
    readonly is_triggered: number
    readonly updated_at_ms: number
}

export interface ActorBeliefRecord {
    readonly belief_id: string
    readonly observer_id: string
    readonly fact_id: string
    readonly subjective_probability_bps: number
    readonly source_type: 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION'
    readonly is_false_belief: number
    readonly learned_at_ms: number
    readonly updated_at_ms: number
}

export interface UnratifiedDetailRecord {
    readonly detail_id: string
    readonly scene_id: string
    readonly entity_id?: string
    readonly salience_bps: number
    readonly claim_proposal: string
    readonly status: 'STAGED' | 'DISCARDED' | 'RATIFIED'
    readonly created_at_ms: number
    readonly reviewed_at_ms?: number
}

export interface LedgerWorkingState {
    readonly reducerVersion: string
    readonly seriesSlug: string
    readonly tick: number
    readonly lastSequenceNumber: number
    readonly lastEventHash: string
    readonly entities: Readonly<Record<string, CompositeEntityLiveRecord>>
    readonly strings: Readonly<Record<string, StringsLedgerRecord>>
    readonly grievances: Readonly<Record<string, GrievanceStatusRecord>>
    readonly clocks: Readonly<Record<string, ParanoiaClockRecord>>
    readonly beliefs: Readonly<Record<string, ActorBeliefRecord>>
    readonly unratifiedDetails: Readonly<Record<string, UnratifiedDetailRecord>>
    readonly stateHash: string
}

export default interface StateSnapshot {
    idx: string
    activeSnapshot: LedgerWorkingState | null
}
