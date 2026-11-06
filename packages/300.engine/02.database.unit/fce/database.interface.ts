/**
 * 02.database.unit - Database Interface Contracts
 * Four-Vector runtime state records, append-only event log, and in-memory tables.
 */

export interface EventLogRecord {
    readonly sequence_id: number
    readonly event_id: string
    readonly stream_id: string
    readonly tick: number
    readonly type: string
    readonly version: number
    readonly actor_id?: string
    readonly target_id?: string
    readonly seed: string
    readonly payload_json: string
    readonly prev_hash: string
    readonly state_hash: string // 64-char lowercase hex
    readonly timestamp_ms: number
}

export interface EntityLiveRecord {
    readonly entity_id: string
    readonly location_id: string
    readonly q: number
    readonly r: number
    readonly arms_available: number // [0, 2]
    readonly legs_available: number // [0, 2]
    readonly locomotion_tier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
    readonly concussion_level: number // [0, 3]
    readonly fatigue_bps: number // [0, 10000]
    readonly pain_bps: number // [0, 10000]
    readonly refusal_strain_bps: number // [0, 10000]
    readonly open_wounds_json: string
    readonly banned_kinetic_verbs_json: string
    readonly held_items_json: string
    readonly worn_gear_json: string
    readonly slung_items_json: string
    readonly cached_items_json: string
    readonly updated_at_ms: number
}

export interface StringsLedgerRecord {
    readonly relation_id: string
    readonly holder_id: string
    readonly debtor_id: string
    readonly weight_bps: number // [0, 10000]
    readonly strings_count: number
    readonly updated_at_ms: number
}

export interface GrievanceStatusRecord {
    readonly grievance_id: string
    readonly instigator_id: string
    readonly victim_id: string
    readonly escalation_depth: number
    readonly cooldown_cycles: number
    readonly intensity_bps: number // [0, 10000]
    readonly status: 'DORMANT' | 'ACTIVE' | 'SIMMERING' | 'RESOLVED'
    readonly updated_at_ms: number
}

export interface ParanoiaClockRecord {
    readonly clock_id: string
    readonly entity_id: string
    readonly clock_name: string
    readonly value_bps: number // [0, 10000]
    readonly threshold_bps: number // [0, 10000]
    readonly decay_rate_bps: number // [0, 10000]
    readonly is_triggered: number // 0 | 1
    readonly updated_at_ms: number
}

export interface ActorBeliefRecord {
    readonly belief_id: string
    readonly observer_id: string
    readonly fact_id: string
    readonly subjective_probability_bps: number // [0, 10000]
    readonly source_type: 'INFERENCE' | 'TESTIMONY' | 'DIRECT_OBSERVATION'
    readonly is_false_belief: number // 0 | 1
    readonly learned_at_ms: number
    readonly updated_at_ms: number
}

export interface UnratifiedDetailRecord {
    readonly detail_id: string
    readonly scene_id: string
    readonly entity_id?: string
    readonly salience_bps: number // [0, 10000]
    readonly claim_proposal: string
    readonly status: 'STAGED' | 'DISCARDED' | 'RATIFIED'
    readonly created_at_ms: number
    readonly reviewed_at_ms?: number
}

export interface TableStatusReport {
    readonly tableName: string
    readonly rowCount: number
    readonly status: 'OK' | 'EMPTY' | 'DIRTY'
}

export interface DatabaseStateReport {
    readonly initialized: boolean
    readonly tables: readonly TableStatusReport[]
    readonly totalRows: number
    readonly timestamp_ms: number
}

export default interface Database {
    idx: string
    isInitialized: boolean
    tables: {
        event_log: Map<string, EventLogRecord>
        entities_live: Map<string, EntityLiveRecord>
        strings_ledger: Map<string, StringsLedgerRecord>
        grievance_status: Map<string, GrievanceStatusRecord>
        paranoia_clocks: Map<string, ParanoiaClockRecord>
        actor_beliefs: Map<string, ActorBeliefRecord>
        unratified_details: Map<string, UnratifiedDetailRecord>
    }
}
