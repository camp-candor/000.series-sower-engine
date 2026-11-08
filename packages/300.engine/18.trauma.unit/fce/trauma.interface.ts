/**
 * 18.trauma.unit - Somatic Trauma Interface Contracts
 * Fixed-point basis-point physical vectors, limb constraints, and locomotion tiers.
 */

export type LocomotionTier = 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'

export interface SomaticTraumaState {
    readonly entityId: string
    readonly armsAvailable: number // Integer: 0, 1, 2
    readonly legsAvailable: number // Integer: 0, 1, 2
    readonly concussionLevel: number // Integer: 0, 1, 2, 3
    readonly fatigueBps: number // [0, 10000]
    readonly painBps: number // [0, 10000]
    readonly refusalStrainBps: number // [0, 10000]
    readonly locomotionTier: LocomotionTier
    readonly updatedAtMs: number
}

export interface TraumaDeltaPayload {
    readonly entityId: string
    readonly deltaArms?: number
    readonly deltaLegs?: number
    readonly deltaConcussion?: number
    readonly deltaFatigueBps?: number
    readonly deltaPainBps?: number
    readonly deltaRefusalStrainBps?: number
    readonly timestampMs?: number
}

export interface RefusalStrainReport {
    readonly entityId: string
    readonly refusalStrainBps: number
    readonly isStrained: boolean // true if refusalStrainBps >= 8000
    readonly thresholdBps: number
}

export default interface Trauma {
    idx: string
    entities: Record<string, SomaticTraumaState>
}
