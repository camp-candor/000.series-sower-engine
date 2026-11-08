/**
 * 19.wounds.unit - Wounds & Negative Motor Mask Contracts
 * Semantic action families, anatomical feature roll-up, and O(1) Panopticon gating.
 */
import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface.js'

export type VerbFamilyKey =
    | 'LOCOMOTION_RAPID'
    | 'LOCOMOTION_VERTICAL'
    | 'BIMANUAL_GRIP'
    | 'MANIPULATION_FINE'
    | 'VOCAL_DELIVERY'
    | 'SUSPICION_AND_AVOIDANCE'

export interface WoundRecord {
    readonly woundId: string
    readonly entityId: string
    readonly locus: string
    readonly conditionTag: string
    readonly severityBps: number // [0, 10000]
    readonly isPermanent: boolean
    readonly createdAtMs: number
}

export interface SomaticMask {
    readonly entityId: string
    readonly armsAvailable: number // 0, 1, 2
    readonly legsAvailable: number // 0, 1, 2
    readonly locomotionTier: LocomotionTier
    readonly openWounds: readonly string[] // Sorted unique tags
    readonly bannedKineticVerbs: readonly string[] // Sorted unique uppercase lemmas
    readonly compiledAtMs: number
}

export interface KineticAuditQuery {
    readonly entityId: string
    readonly proposedVerbs: readonly string[]
    readonly sceneContext?: string
}

export interface KineticAuditReceipt {
    readonly entityId: string
    readonly permitted: boolean
    readonly breachedVerbs: readonly string[]
    readonly totalBannedVerbsCount: number
    readonly timestampMs: number
}

export default interface Wounds {
    idx: string
    woundsByEntity: Record<string, WoundRecord[]>
    masksByEntity: Record<string, SomaticMask>
}
