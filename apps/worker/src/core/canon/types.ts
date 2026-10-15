import { z } from 'zod';

export const SomaticVectorSchema = z.object({
  armsAvailable: z.number().int().min(0).max(2),
  locomotionTier: z.enum(['UNRESTRICTED', 'LIMPING', 'IMMOBILIZED']),
  concussionLevel: z.number().int().min(0).max(3),
  openWounds: z.array(z.string()),
  bannedKineticVerbs: z.array(z.string()),
});

export const EquipSlotSchema = z.object({
  held: z.array(z.string()).max(2),
  worn: z.record(z.string(), z.string()),
  slung: z.array(z.string()),
});

export const CharacterEntitySchema = z.object({
  id: z.string().regex(/^char_[a-z0-9_]+$/),
  name: z.string().min(1),
  scope: z.literal('CHARACTER'),
  version: z.number().int().positive(),
  somatic: SomaticVectorSchema,
  logistical: EquipSlotSchema,
  voice: z.object({
    surfaceArgument: z.string(),
    theUnderneath: z.string(),
    refusalVectors: z.array(z.string()),
    callbackPhrases: z.array(z.string()),
  }),
});

export const LocationEntitySchema = z.object({
  id: z.string().regex(/^loc_[a-z0-9_]+$/),
  name: z.string().min(1),
  scope: z.literal('LOCATION'),
  version: z.number().int().positive(),
  portals: z.array(z.string()),
  environmentalModifiers: z.record(z.string(), z.number().int()),
});

export const PossessionEntitySchema = z.object({
  id: z.string().regex(/^item_[a-z0-9_]+$/),
  name: z.string().min(1),
  scope: z.literal('LOGISTIC'),
  version: z.number().int().positive(),
  holderId: z.string().nullable(),
  massBasisPoints: z.number().int().min(0).max(10000),
  requiresLimbs: z.number().int().min(0).max(2),
});

export const GrievanceEntitySchema = z.object({
  id: z.string().regex(/^grv_[a-z0-9_]+$/),
  scope: z.literal('LAW'),
  version: z.number().int().positive(),
  sourceActorId: z.string(),
  targetActorId: z.string(),
  escalatesToId: z.string().nullable(),
  intensityBasisPoints: z.number().int().min(0).max(10000),
});

export const CanonMetaSchema = z.object({
  seriesSlug: z.string(),
  state_hash: z.string().length(64),
  compiled_at: z.string(),
  compiler_version: z.string(),
});

export const BibleStateSchema = z.object({
  _meta: CanonMetaSchema,
  characters: z.record(z.string(), CharacterEntitySchema),
  locations: z.record(z.string(), LocationEntitySchema),
  possessions: z.record(z.string(), PossessionEntitySchema),
  grievances: z.record(z.string(), GrievanceEntitySchema),
});

export type SomaticVector = z.infer<typeof SomaticVectorSchema>;
export type CharacterEntity = z.infer<typeof CharacterEntitySchema>;
export type LocationEntity = z.infer<typeof LocationEntitySchema>;
export type PossessionEntity = z.infer<typeof PossessionEntitySchema>;
export type GrievanceEntity = z.infer<typeof GrievanceEntitySchema>;
export type BibleState = z.infer<typeof BibleStateSchema>;
