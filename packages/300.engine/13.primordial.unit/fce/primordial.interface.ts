export interface PrimordialEntitySeed {
    readonly entityId: string
    readonly locationId: string
    readonly coordQ: number
    readonly coordR: number
    readonly armsAvailable: number // [0, 2]
    readonly legsAvailable: number // [0, 2]
    readonly locomotionTier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
    readonly concussionLevel: number // [0, 3]
    readonly fatigueBps: number // [0, 10000]
    readonly painBps: number // [0, 10000]
    readonly refusalStrainBps: number // [0, 10000]
    readonly openWounds: readonly string[]
    readonly bannedKineticVerbs: readonly string[]
    readonly heldItems: readonly string[]
    readonly wornGear: readonly string[]
    readonly slungItems: readonly string[]
    readonly cachedItems: readonly string[]
}

export interface PrimordialGrievanceSeed {
    readonly grievanceId: string
    readonly instigatorId: string
    readonly victimId: string
    readonly escalationDepth: number
    readonly cooldownCycles: number
    readonly intensityBps: number // [0, 10000]
    readonly status: 'DORMANT' | 'ACTIVE' | 'SIMMERING' | 'RESOLVED'
}

export interface PrimordialClockSeed {
    readonly clockId: string
    readonly entityId: string
    readonly clockName: string
    readonly valueBps: number // [0, 10000]
    readonly thresholdBps: number // [0, 10000]
    readonly decayRateBps: number // [0, 10000]
}

export interface GenesisSeedingResult {
    readonly seeded: boolean
    readonly seriesSlug: string
    readonly hRoot: string
    readonly eventHash: string
    readonly entitiesCount: number
    readonly grievancesCount: number
    readonly clocksCount: number
    readonly seededAtMs: number
}

export default interface Primordial {
    idx: string
    hRoot: string
    genesisSeeded: boolean
    activeSeriesSlug: string
}
