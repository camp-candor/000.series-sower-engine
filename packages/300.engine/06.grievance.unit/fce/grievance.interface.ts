/**
 * 06.grievance.unit - Grievance Interface Contracts
 * Dual-rail Machine Rail set filtering, escalation tracking, and Stage 3 encounter selection.
 */

export type GrievanceStatus = 'DORMANT' | 'ACTIVE' | 'SIMMERING' | 'RESOLVED'

export interface GrievanceRecord {
    readonly grievance_id: string
    readonly instigator_id: string
    readonly victim_id: string
    readonly category: string
    readonly escalation_depth: number // Non-negative integer
    readonly cooldown_cycles: number // Non-negative integer (0 = eligible)
    readonly intensity_bps: number // [0, 10000]
    readonly min_intensity_bps: number // [0, 10000]
    readonly max_intensity_bps: number // [0, 10000]
    readonly status: GrievanceStatus
    readonly primary_actors: readonly string[]
    readonly excluded_actors: readonly string[]
    readonly required_props: readonly string[]
    readonly location_tags: readonly string[]
    readonly spawns_on_max_escalation?: string
    readonly updated_at_ms: number
}

export interface UpsertGrievanceParams {
    readonly grievance_id: string
    readonly instigator_id: string
    readonly victim_id: string
    readonly category?: string
    readonly escalation_depth?: number
    readonly cooldown_cycles?: number
    readonly intensity_bps?: number
    readonly min_intensity_bps?: number
    readonly max_intensity_bps?: number
    readonly status?: GrievanceStatus
    readonly primary_actors?: readonly string[]
    readonly excluded_actors?: readonly string[]
    readonly required_props?: readonly string[]
    readonly location_tags?: readonly string[]
    readonly spawns_on_max_escalation?: string
    readonly timestamp_ms?: number
}

export interface EscalateGrievanceParams {
    readonly grievance_id: string
    readonly intensity_delta_bps: number
    readonly add_cooldown_cycles?: number
    readonly next_status?: GrievanceStatus
    readonly tick?: number
    readonly timestamp_ms?: number
}

export interface GrievanceFilterQuery {
    readonly sceneCast: readonly string[]
    readonly currentTensionBps?: number
    readonly actorA?: string
    readonly actorB?: string
}

export interface Stage3SelectionParams {
    readonly sceneCast: readonly string[]
    readonly currentTensionBps: number
    readonly tick: number
    readonly timestamp_ms: number
    readonly forceBoilOver?: boolean
}

export interface Stage3SelectionReceipt {
    readonly selected: boolean
    readonly grievance_id: string
    readonly instigator_id: string
    readonly victim_id: string
    readonly category: string
    readonly intensity_bps: number
    readonly escalation_depth: number
    readonly isBoilOver: boolean
    readonly jaccardSimilarity: number
    readonly error?: string
    readonly timestamp_ms: number
}

export interface JaccardAuditReport {
    readonly candidateId: string
    readonly recentComparisonId: string
    readonly similarity: number
    readonly breachedThreshold: boolean // true if similarity >= 0.65
}

export default interface Grievance {
    idx: string
    records: Map<string, GrievanceRecord>
    recentEncounterHistory: string[] // Last K encounter grievance IDs
}
