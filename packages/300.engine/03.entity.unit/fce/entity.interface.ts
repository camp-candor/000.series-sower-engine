import type { SomaticTraumaState } from '../../18.trauma.unit/fce/trauma.interface'
import type { EntityInventoryState } from '../../07.inventory.unit/fce/inventory.interface'
import type { ActorSpatialPosition } from '../../11.movement.unit/fce/movement.interface'
import type { SomaticMask } from '../../19.wounds.unit/fce/wounds.interface'

export interface CompositeEntityState {
    entityId: string
    locationId: string
    q: number
    r: number
    armsAvailable: number
    legsAvailable: number
    locomotionTier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED' | string
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
    updatedAtMs: number
}

export interface EntityLiveDbRow {
    entity_id: string
    location_id: string
    coord_q?: number
    coord_r?: number
    q?: number
    r?: number
    arms_available: number

    legs_available: number
    locomotion_tier: string
    concussion_level: number
    fatigue_bps: number
    pain_bps: number
    refusal_strain_bps: number
    open_wounds_json: string
    banned_kinetic_verbs_json: string
    held_items_json: string
    worn_gear_json: string
    slung_items_json: string
    cached_items_json: string
    updated_at_ms: number
}

export interface UpsertEntityPayload {
    composite: CompositeEntityState
    persistToDb?: boolean
}

export default interface Entity {
    idx: string
    entities: Record<string, CompositeEntityState>
}
