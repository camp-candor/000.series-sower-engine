/**
 * 11.movement.unit - Movement Bit Payload Contracts
 */
import type {
    AxialCoord,
    TerrainType,
    ActorMovementState,
    MovementRequest,
    MovementReceipt,
    DistanceAuditReceipt,
} from './movement.interface.js'
import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface.js'

export interface MovementPayload {
    readonly actorId?: string
    readonly locationId?: string
    readonly coord?: AxialCoord
    readonly fromCoord?: AxialCoord
    readonly toCoord?: AxialCoord
    readonly terrainType?: TerrainType
    readonly locomotionTier?: LocomotionTier
    readonly currentTick?: number
    readonly movementRequest?: MovementRequest
    readonly movementReceipt?: MovementReceipt
    readonly distanceAudit?: DistanceAuditReceipt
    readonly actorState?: ActorMovementState
    readonly timestampMs?: number
    readonly error?: string
}

export default interface MovementBit {
    idx: string
    src?: string
    val?: number
    dat?: MovementPayload
    slv?: Function
}
