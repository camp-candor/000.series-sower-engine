/**
 * 10.location.unit - Location Buzzer Barrel Export
 */
export {
    initLocation,
    updateLocation,
    registerLocation,
    setPortalLockAction,
    validateAdjacencyAction,
    checkPortalCrossingAction,
    traverseLocationAction,
    auditTopologyAction,
    validateLocationAdjacency,
    auditTopologySymmetry,
    portalKey,
    bindSpatialPortAction,
    evaluateSpatialPathAction,
    evaluateSpatialPerceptionAction,
} from './buz/location.buzz.js'

export { BASELINE_TOPOLOGY_LOCATIONS } from './location.model.js'

export type {
    LightingLevel,
    PortalStatus,
    SpatialNodeDescriptor,
    PortalRecord,
    TraversalRequest,
    TraversalReceipt,
    TopologyValidationReport,
} from './fce/location.interface.js'

export type { LocationPayload } from './fce/location.bit.js'

export type {
    AxialCoord,
    PackedAxial,
    SpatialOverlaySnapshot,
} from './fce/spatial-overlay.interface.js'

export type {
    SpatialPort,
    TopologyManifest,
    SpatialReceiptMetadata,
    PathReceipt,
    PerceptCandidate,
    DisplacementResult,
} from './fce/spatial-port.interface.js'
