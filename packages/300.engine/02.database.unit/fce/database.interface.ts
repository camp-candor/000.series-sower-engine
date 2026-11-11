/**
 * 02.database.unit - Database Interface Contracts
 * Four-Vector runtime state records, flat continuity tables, and invalidation views.
 */

export type FactScope = 'CHARACTER' | 'LOCATION' | 'LOGISTIC' | 'LAW'

export type FactAuthorityLevel =
    | 'AXIOM'
    | 'CANON'
    | 'EVENT'
    | 'RUNTIME_STATE'
    | 'PROJECTION'
    | 'SPECULATION'

export type FactStanding =
    | 'ACTIVE_ENDORSED'
    | 'FLAGGED_FOR_REVIEW'
    | 'DEPRECATED_ARCHIVED'

export type SceneStatus = 'clean' | 'dirty' | 'reviewed'

export type DependencyEntityType =
    | 'character'
    | 'location'
    | 'possession'
    | 'grievance'
    | 'axiom'

export interface FactRecord {
    readonly id: string
    readonly claim_text: string
    readonly scope: FactScope
    readonly authority_level: FactAuthorityLevel
    readonly standing: FactStanding
    readonly author: string
    readonly version: number
    readonly timestamp_ms: number
    readonly last_edited_at_ms: number
}

export interface SceneRecord {
    readonly id: string
    readonly episode_num: number
    readonly scene_num: number
    readonly text: string
    readonly status: SceneStatus
    readonly is_dirty: number // 0 | 1
    readonly dirty_reason?: string
    readonly created_at_ms: number
    readonly updated_at_ms: number
}

export interface SceneFactDependencyRecord {
    readonly scene_id: string
    readonly fact_id: string
    readonly entity_type: DependencyEntityType
    readonly pinned_version: number
    readonly is_dirty: number // 0 | 1
    readonly invalidation_reason?: string
    readonly created_at_ms: number
    readonly invalidated_at_ms?: number
}

export interface FactCentralityTelemetry {
    readonly fact_id: string
    readonly scope: FactScope
    readonly current_version: number
    readonly standing: FactStanding
    readonly dependent_scenes_count: number
}

export interface EventLogRecord {
    readonly sequence_id: number
    readonly sequence_number?: number
    readonly event_id: string
    readonly stream_id: string
    readonly tick: number
    readonly type: string
    readonly version: number
    readonly actor_id?: string
    readonly target_id?: string
    readonly seed: string
    readonly payload_json: string
    readonly topology_hash?: string
    readonly overlay_hash?: string
    readonly query_hash?: string
    readonly receipt_hash?: string
    readonly prev_hash: string
    readonly state_hash: string
    readonly timestamp_ms: number
}

export interface EntityLiveRecord {
    readonly entity_id: string
    readonly location_id: string
    readonly q: number
    readonly r: number
    readonly arms_available: number
    readonly legs_available: number
    readonly locomotion_tier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
    readonly concussion_level: number
    readonly fatigue_bps: number
    readonly pain_bps: number
    readonly refusal_strain_bps: number
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

export interface DatabaseConnectionMetadata {
    seriesSlug: string
    storageTarget: string
    isOpen: boolean
    walEnabled: boolean
    foreignKeysEnabled: boolean
    mountedAtMs: number
}

export interface SchemaInventoryReport {
    tables: string[]
    views: string[]
    triggers: string[]
    isArmored: boolean
}

export default interface Database {
    connection?: any
    activeMetadata?: DatabaseConnectionMetadata
    schemaReport?: SchemaInventoryReport
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
        facts: Map<string, FactRecord>
        scenes: Map<string, SceneRecord>
        scene_fact_dependencies: Map<string, SceneFactDependencyRecord>
    }
}

export interface SpatialProofQuadruple {
    topologyHash: string
    overlayHash: string
    queryHash: string
    receiptHash: string
}

export interface AppendSpatialEventPayload {
    eventId: string
    tick: number
    eventType: string
    actorId?: string
    payloadJson: string
    prevEventHash: string
    eventHash: string
    spatialProof?: SpatialProofQuadruple
    timestampMs?: number
}
