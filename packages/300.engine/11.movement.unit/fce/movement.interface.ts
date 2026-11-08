/**
 * 11.movement.unit - Movement Interface Contracts
 * Axial hex coordinate evaluation, locomotion tier gating, and busy tick scheduling.
 */
import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface.js'

export interface AxialCoord {
    readonly q: number // Axial column coordinate
    readonly r: number // Axial row coordinate
}

export type TerrainType =
    | 'CLEAR'
    | 'RUBBLE'
    | 'WATER_SUBMERGED'
    | 'CRAWLWAY'
    | 'CONSTRICTED'

export interface ActorMovementState {
    readonly actorId: string
    readonly locationId: string
    readonly coord: AxialCoord
    readonly locomotionTier: LocomotionTier
    readonly busyUntilTick: number
    readonly updatedAtMs: number
}

export interface MovementRequest {
    readonly actorId: string
    readonly locationId: string
    readonly fromCoord: AxialCoord
    readonly toCoord: AxialCoord
    readonly currentTick: number
    readonly timestampMs: number
    readonly terrainType?: TerrainType
    readonly locomotionTier?: LocomotionTier
}

export interface MovementReceipt {
    readonly permitted: boolean
    readonly actorId: string
    readonly locationId: string
    readonly fromCoord: AxialCoord
    readonly toCoord: AxialCoord
    readonly distance: number
    readonly traversalCostTicks: number
    readonly busyUntilTick: number
    readonly error?: string
    readonly timestampMs: number
}

export interface DistanceAuditReceipt {
    readonly fromCoord: AxialCoord
    readonly toCoord: AxialCoord
    readonly distance: number
    readonly isAdjacent: boolean
    readonly permittedForInteraction: boolean
}

export default interface Movement {
    idx: string
    actorPositions: Map<string, ActorMovementState>
    occupiedCells: Map<string, string> // key: `${locationId}#${q}:${r}` -> actorId
}
