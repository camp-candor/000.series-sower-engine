import { z } from 'zod'

export type DeepReadonly<T> = T extends
    | ((...args: never[]) => unknown)
    | boolean
    | number
    | string
    | null
    | undefined
    ? T
    : T extends Array<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : T extends Map<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer M>
          ? ReadonlySet<DeepReadonly<M>>
          : { readonly [P in keyof T]: DeepReadonly<T[P]> }

export const CanonMetaSchema = z.object({
    seriesSlug: z.string().min(1),
    version: z.number().int().positive(),
    compiled_at: z.string(),
    state_hash: z
        .string()
        .length(64)
        .regex(/^[a-f0-9]{64}$/),
    compiler_version: z.string().default('1.0.0'),
})

export const SomaticVectorSchema = z.object({
    armsAvailable: z.number().int().min(0).max(2),
    locomotionTier: z.enum(['UNRESTRICTED', 'LIMPING', 'IMMOBILIZED']),
    concussionLevel: z.number().int().min(0).max(3),
    openWounds: z.array(z.string()).readonly(),
    bannedKineticVerbs: z.array(z.string()).readonly(),
})

export const EquipSlotSchema = z.object({
    held: z.array(z.string()).max(2).readonly(),
    worn: z.record(z.string(), z.string()).readonly(),
    slung: z.array(z.string()).readonly(),
})

export const VoiceRailSchema = z.object({
    surfaceArgument: z.string(),
    theUnderneath: z.string(),
    refusalVectors: z.array(z.string()).readonly(),
    callbackPhrases: z.array(z.string()).readonly(),
    centralIrony: z.string().optional(),
})

export const CharacterEntitySchema = z.object({
    id: z.string().regex(/^char_[a-z0-9_]+$/),
    name: z.string().min(1),
    scope: z.literal('CHARACTER'),
    version: z.number().int().positive(),
    factionId: z.string().default('neutral'),
    somatic: SomaticVectorSchema,
    logistical: EquipSlotSchema,
    voice: VoiceRailSchema,
})

export const LocationEntitySchema = z.object({
    id: z.string().regex(/^loc_[a-z0-9_]+$/),
    name: z.string().min(1),
    scope: z.literal('LOCATION'),
    version: z.number().int().positive(),
    portals: z.array(z.string()).readonly(),
    acousticDampingFactor: z.number().int().min(0).max(10000).default(0),
    environmentalModifiers: z
        .record(z.string(), z.number().int())
        .readonly()
        .default({}),
})

export const PossessionEntitySchema = z.object({
    id: z.string().regex(/^item_[a-z0-9_]+$/),
    name: z.string().min(1),
    scope: z.literal('LOGISTIC'),
    version: z.number().int().positive(),
    holderId: z.string().nullable(),
    massBasisPoints: z.number().int().min(0).max(10000),
    requiresLimbs: z.number().int().min(0).max(2),
})

export const GrievanceEntitySchema = z.object({
    id: z.string().regex(/^grv_[a-z0-9_]+$/),
    scope: z.literal('LAW'),
    version: z.number().int().positive(),
    sourceActorId: z.string(),
    targetActorId: z.string(),
    escalatesToId: z.string().nullable().default(null),
    intensityBasisPoints: z.number().int().min(0).max(10000),
    cooldownCycles: z.number().int().min(0).default(0),
})

export const BibleStateSchema = z.object({
    _meta: CanonMetaSchema,
    characters: z.record(z.string(), CharacterEntitySchema),
    locations: z.record(z.string(), LocationEntitySchema),
    possessions: z.record(z.string(), PossessionEntitySchema),
    grievances: z.record(z.string(), GrievanceEntitySchema),
})

export type SomaticVector = z.infer<typeof SomaticVectorSchema>
export type EquipSlot = z.infer<typeof EquipSlotSchema>
export type VoiceRail = z.infer<typeof VoiceRailSchema>
export type CharacterEntity = z.infer<typeof CharacterEntitySchema>
export type LocationEntity = z.infer<typeof LocationEntitySchema>
export type PossessionEntity = z.infer<typeof PossessionEntitySchema>
export type GrievanceEntity = z.infer<typeof GrievanceEntitySchema>
export type BibleState = z.infer<typeof BibleStateSchema>
export type CanonMeta = z.infer<typeof CanonMetaSchema>

export interface MachineRail {
    id: string
    name: string
    scope: 'CHARACTER'
    version: number
    factionId: string
    somatic: SomaticVector
    logistical: EquipSlot
}

export interface DualRailCharacter {
    id: string
    machine: MachineRail
    voice: VoiceRail
}

export interface SealedBibleState {
    meta: DeepReadonly<CanonMeta>
    characters: DeepReadonly<Record<string, DualRailCharacter>>
    locations: DeepReadonly<Record<string, LocationEntity>>
    possessions: DeepReadonly<Record<string, PossessionEntity>>
    grievances: DeepReadonly<Record<string, GrievanceEntity>>
    rawState: DeepReadonly<BibleState>
}

export interface BibleLoaderOptions {
    expectedRootHash?: string
    skipHashVerification?: boolean
}

/**
 * Checkpoint provider port: abstracts ledger access (D1/SQLite)
 * without leaking runtime database bindings into the kernel.
 */
export interface ICanonCheckpointPort {
    getActiveCheckpoint(
        seriesSlug: string,
    ): Promise<{ stateHash: string; isDirty: boolean } | null>
}

export interface CanonCheckpointVerificationResult {
    valid: boolean
    seriesSlug: string
    snapshotStateHash: string
    ledgerCheckpointHash: string
    isDirty: boolean
    verifiedAtIso: string
}

/**
 * Two-Tier Dependency Fingerprint Contracts
 */
export interface EntityDependencyNode {
    id: string
    type: 'character' | 'location' | 'possession' | 'grievance'
    contentHash: string
    directFkIds: readonly string[]
}

export interface DependencyFingerprint {
    entityId: string
    contentHash: string
    oneHopHash: string
    transitiveHash: string
    directFkIds: readonly string[]
    transitiveFkIds: readonly string[]
}

export interface AdvisoryRebaseResult {
    requiresRebase: boolean
    entityId: string
    previousOneHopHash: string
    currentOneHopHash: string
    changedFkIds: readonly string[]
    advisoryMessage: string
}
