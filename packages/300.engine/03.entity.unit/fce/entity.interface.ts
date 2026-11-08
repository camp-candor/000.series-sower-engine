/**
 * 03.entity.unit - Entity Interface Contracts
 * Multi-vector materialized entity state and entities_live database row mapping.
 */
import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface.js'

export interface CompositeEntityState {
    readonly entityId: string
    readonly locationId: string
    readonly q: number
    readonly r: number
    readonly armsAvailable: number // 0, 1, 2
    readonly legsAvailable: number // 0, 1, 2
    readonly locomotionTier: LocomotionTier
    readonly concussionLevel: number // 0, 1, 2, 3
    readonly fatigueBps: number // [0, 10000]
    readonly painBps: number // [0, 10000]
    readonly refusalStrainBps: number // [0, 10000]
    readonly openWounds: readonly string[]
    readonly bannedKineticVerbs: readonly string[]
    readonly heldItems: readonly string[]
    readonly wornGear: Readonly<Record<string, string>>
    readonly slungItems: readonly string[]
    readonly cachedItems: readonly string[]
    readonly updatedAtMs: number
}

export interface EntityLiveDbRow {
    readonly entity_id: string
    readonly location_id: string
    readonly q: number
    readonly r: number
    readonly arms_available: number
    readonly legs_available: number
    readonly locomotion_tier: string
    readonly concussion_level: number
    readonly fatigue_bps: number
    readonly pain_bps: number
    readonly refusal_strain_bps: number
    readonly open_wounds_json: string
    readonly banned_kinetic_verbs_json: string
    readonly held_items_json: string
    readonly worn_gear_json: string
    readonly slung_items_json: string
    readonly cached_items_json: string
    readonly updated_at_ms: number
}

export interface AssembleEntityParams {
    readonly entityId: string
    readonly locationId?: string
    readonly q?: number
    readonly r?: number
    readonly armsAvailable?: number
    readonly legsAvailable?: number
    readonly locomotionTier?: LocomotionTier
    readonly concussionLevel?: number
    readonly fatigueBps?: number
    readonly painBps?: number
    readonly refusalStrainBps?: number
    readonly openWounds?: readonly string[]
    readonly bannedKineticVerbs?: readonly string[]
    readonly heldItems?: readonly string[]
    readonly wornGear?: Readonly<Record<string, string>>
    readonly slungItems?: readonly string[]
    readonly cachedItems?: readonly string[]
    readonly timestampMs?: number
}

export interface EntityQueryFilter {
    readonly locationId?: string
    readonly entityId?: string
}

export default interface Entity {
    idx: string
    entities: Map<string, CompositeEntityState>
}
