import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface'

export type VerbFamilyKey =
    | 'LOCOMOTION_RAPID'
    | 'LOCOMOTION_VERTICAL'
    | 'BIMANUAL_GRIP'
    | 'MANIPULATION_FINE'
    | 'VOCAL_DELIVERY'
    | 'SUSPICION_AND_AVOIDANCE'

export interface WoundRecord {
    woundId: string
    locus: string
    conditionTag: string
    severityBps: number // Integer basis points: 0 to 10,000 bps
    isPermanent: boolean
}

export interface SomaticMask {
    entityId: string
    armsAvailable: number // 0, 1, or 2
    legsAvailable: number // 0, 1, or 2
    locomotionTier: LocomotionTier
    openWounds: string[] // Lexicographically sorted unique condition tags
    bannedKineticVerbs: string[] // Lexicographically sorted unique uppercase verb lemmas
}

export interface KineticAuditQuery {
    entityId: string
    candidateVerbs: string[]
}

export interface KineticAuditReceipt {
    allowed: boolean
    entityId: string
    breachedVerbs: string[]
    bannedKineticVerbs: string[]
    timestampIso: string
}

export default interface Wounds {
    idx: string
    woundsByEntity: Record<string, WoundRecord[]>
    masksByEntity: Record<string, SomaticMask>
}
