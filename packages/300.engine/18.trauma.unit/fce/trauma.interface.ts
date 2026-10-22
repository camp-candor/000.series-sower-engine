export type LocomotionTier = 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'

export interface SomaticTraumaState {
    entityId: string
    armsAvailable: number // Integer: 0, 1, 2
    legsAvailable: number // Integer: 0, 1, 2
    concussionLevel: number // Integer: 0, 1, 2, 3
    fatigueBps: number // 0 to 10,000 bps
    painBps: number // 0 to 10,000 bps
    refusalStrainBps: number // 0 to 10,000 bps
    locomotionTier: LocomotionTier
    updatedAtMs: number
}

export interface TraumaDeltaPayload {
    entityId: string
    deltaArms?: number
    deltaLegs?: number
    deltaConcussion?: number
    deltaFatigueBps?: number
    deltaPainBps?: number
    deltaRefusalStrainBps?: number
}

export interface RefusalStrainReport {
    entityId: string
    refusalStrainBps: number
    isStrained: boolean // true if refusalStrainBps >= 8000
    thresholdBps: number
}

export default interface Trauma {
    idx: string
    entities: Record<string, SomaticTraumaState>
}
