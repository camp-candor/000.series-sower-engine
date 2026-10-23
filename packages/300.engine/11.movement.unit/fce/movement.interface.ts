import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface'
import type { PortalState } from '../../10.location.unit/fce/location.interface'

export interface AxialCoord {
    q: number
    r: number
    s: number // Invariant: q + r + s === 0
}

export interface ActorSpatialPosition {
    entityId: string
    locationId: string
    coord: AxialCoord
    locomotionTier: LocomotionTier
    updatedAtMs: number
}

export interface MoveEvaluationQuery {
    entityId: string
    sourceLocationId: string
    destinationLocationId?: string // If crossing portals
    portalId?: string
    portalState?: PortalState
    origin: AxialCoord
    destination: AxialCoord
    locomotionTier: LocomotionTier
}

export interface MoveEvaluationReceipt {
    allowed: boolean
    entityId: string
    axialDistance: number
    traversalCostUnits: number // Base integer steps * speed multiplier
    error?: string
}

export default interface Movement {
    idx: string
    positions: Record<string, ActorSpatialPosition>
}
