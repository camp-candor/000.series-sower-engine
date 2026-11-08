/**
 * 10.location.unit - Location Bit Payload Contracts
 */
import type {
    SpatialNodeDescriptor,
    PortalRecord,
    PortalStatus,
    TraversalRequest,
    TraversalReceipt,
    TopologyValidationReport,
} from './location.interface.js'

export interface LocationPayload {
    readonly locationId?: string
    readonly portalId?: string
    readonly portalStatus?: PortalStatus
    readonly node?: SpatialNodeDescriptor
    readonly nodes?: readonly SpatialNodeDescriptor[]
    readonly portal?: PortalRecord
    readonly portals?: readonly PortalRecord[]
    readonly traversalRequest?: TraversalRequest
    readonly traversalReceipt?: TraversalReceipt
    readonly topologyReport?: TopologyValidationReport
    readonly occupants?: readonly string[]
    readonly timestampMs?: number
    readonly error?: string
}

export default interface LocationBit {
    idx: string
    src?: string
    val?: number
    dat?: LocationPayload
    slv?: Function
}
