export interface PrimordialEntitySeed {
    entityId: string
    locationId: string
    coordQ: number
    coordR: number
    armsAvailable: number
    legsAvailable: number
    locomotionTier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
    concussionLevel: number
    fatigueBps: number
    painBps: number
    refusalStrainBps: number
    openWounds: string[]
    bannedKineticVerbs: string[]
    heldItems: string[]
    wornGear: Record<string, string>
    slungItems: string[]
    cachedItems: string[]
}

export interface PrimordialGrievanceSeed {
    grievanceId: string
    instigatorId: string
    victimId: string
    escalationDepth: number
    cooldownCycles: number
    intensityBps: number
    status: 'DORMANT' | 'ACTIVE' | 'SIMMERING' | 'RESOLVED'
}

export interface PrimordialClockSeed {
    clockId: string
    entityId: string
    clockName: string
    valueBps: number
    thresholdBps: number
    decayRateBps: number
}

export interface PrimordialBaselinePayload {
    seriesSlug: string
    version: number
    entities: PrimordialEntitySeed[]
    grievances: PrimordialGrievanceSeed[]
    clocks: PrimordialClockSeed[]
    originLocationId: string
    founderTokenId: string
}

export interface GenesisSeedingResult {
    seeded: boolean
    seriesSlug: string
    hRoot: string
    eventHash: string
    entitiesCount: number
    grievancesCount: number
    clocksCount: number
    seededAtMs: number
}

export default interface Primordial {
    idx: string
    hRoot: string
    genesisSeeded: boolean
    baseline: PrimordialBaselinePayload
}
