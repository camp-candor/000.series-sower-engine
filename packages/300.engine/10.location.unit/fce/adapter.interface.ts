/**
 * 10.location.unit - Synchronous Spatial Adapter Contracts
 * Plain-data interfaces for in-process execution and batch path queries.
 */
import type { ScrubbedPathQuery } from './sanitizer.interface.js'
import type { SpatialOverlaySnapshot } from './spatial-overlay.interface.js'
import type {
    PathReceipt,
    SpatialReceiptMetadata,
} from './spatial-port.interface.js'

export interface BatchPathQuery {
    readonly topologyHash: string
    readonly overlay: SpatialOverlaySnapshot
    readonly queries: readonly ScrubbedPathQuery[]
    readonly defaultWorkEnvelopeLimit?: number
}

export interface BatchPathReceipt {
    readonly ok: boolean
    readonly receipts: readonly PathReceipt[]
    readonly totalCellsExpanded: number
    readonly batchQueryHash: string
    readonly batchReceiptHash: string
    readonly cryptographicQuadruple: SpatialReceiptMetadata
}
