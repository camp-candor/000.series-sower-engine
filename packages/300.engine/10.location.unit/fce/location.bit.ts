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
import type {
    SpatialPort,
    TopologyManifest,
    PathReceipt,
    PerceptCandidate,
} from './spatial-port.interface.js'
import type {
    SpatialOverlaySnapshot,
    PackedAxial,
} from './spatial-overlay.interface.js'

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

    // SpatialPort binding and query payloads
    readonly spatialPort?: SpatialPort
    readonly topologyManifest?: TopologyManifest
    readonly overlaySnapshot?: SpatialOverlaySnapshot
    readonly originPacked?: PackedAxial
    readonly destinationPacked?: PackedAxial
    readonly sourceCellPacked?: PackedAxial
    readonly observerCellPacked?: PackedAxial
    readonly emissionEnergyCdB?: number
    readonly maxBudgetCostUnits?: number
    readonly workEnvelopeLimit?: number
    readonly pathReceipt?: PathReceipt
    readonly perceptCandidate?: PerceptCandidate
}

export default interface LocationBit<TDat = LocationPayload, TLst = string> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: { locBit: Partial<LocationBit<TDat, TLst>> }) => void
}
