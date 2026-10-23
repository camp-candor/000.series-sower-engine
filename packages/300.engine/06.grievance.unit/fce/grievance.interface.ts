/**
 * 06.grievance.unit - Relational Conflict & Escalation Vector
 * Invariant: instigator_id !== victim_id. Cooldown must be 0 for scene eligibility.
 */
export type GrievanceStatus = 'DORMANT' | 'ACTIVE' | 'SIMMERING' | 'RESOLVED'

export interface GrievanceStatusRecord {
    grievance_id: string
    instigator_id: string
    victim_id: string
    escalation_depth: number // >= 0
    cooldown_cycles: number // >= 0
    intensity_bps: number // 0 to 10,000 basis points
    status: GrievanceStatus
    updated_at_ms: number
}

export default interface Grievance {
    idx: string
    records: Record<string, GrievanceStatusRecord>
}
