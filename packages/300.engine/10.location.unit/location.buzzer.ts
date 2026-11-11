/**
 * 10.location.unit - Location Buzzer Barrel Re-Exports
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

export { packAxial, unpackAxial } from './buz/axial-pack.buzz.js'
export {
    sanitizePathQuery,
    sanitizePerceptionQuery,
} from './buz/sanitizer.buzz.js'
export { buildSpatialOverlaySnapshot } from './buz/overlay-builder.buzz.js'
export {
    verifyTraversalBudget,
    type BudgetGuardResult,
} from './buz/budget-guard.buzz.js'
export {
    InProcessSpatialAdapter,
    HARD_WORK_ENVELOPE_CEILING,
} from './buz/in-process-adapter.buzz.js'
export { executeBatchPath } from './buz/batch-path.buzz.js'

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

export type {
    ScrubbedPathQuery,
    ScrubbedPerceptionQuery,
    QuerySanitizationResult,
    RawSpatialQueryInput,
} from './fce/sanitizer.interface.js'

export type {
    BatchPathQuery,
    BatchPathReceipt,
} from './fce/adapter.interface.js'
