/**
 * 10.location.unit - Synchronous Batch Path Dispatch Executor
 * Evaluates multiple scrubbed path queries in a single synchronous pass.
 */
import crypto from 'node:crypto'
import type {
    SpatialPort,
    TopologyManifest,
    PathReceipt,
    SpatialReceiptMetadata,
} from '../fce/spatial-port.interface.js'
import type { SpatialOverlaySnapshot } from '../fce/spatial-overlay.interface.js'
import type { ScrubbedPathQuery } from '../fce/sanitizer.interface.js'
import type { BatchPathReceipt } from '../fce/adapter.interface.js'

const canonicalizeJson = (val: unknown): string => {
    if (val === null || typeof val !== 'object') {
        return JSON.stringify(val)
    }
    if (Array.isArray(val)) {
        return '[' + val.map((item) => canonicalizeJson(item)).join(',') + ']'
    }
    const keys = Object.keys(val as Record<string, unknown>).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )
    return (
        '{' +
        keys
            .map(
                (k) =>
                    JSON.stringify(k) + ':' + canonicalizeJson((val as any)[k]),
            )
            .join(',') +
        '}'
    )
}

export const executeBatchPath = (
    adapter: SpatialPort,
    manifest: TopologyManifest,
    overlay: SpatialOverlaySnapshot,
    queries: readonly ScrubbedPathQuery[],
): BatchPathReceipt => {
    const receipts: PathReceipt[] = []
    let totalCellsExpanded = 0
    let allOk = true

    for (const q of queries) {
        const receipt = adapter.findPath(
            manifest,
            overlay,
            q.originPacked,
            q.destinationPacked,
            q.maxBudgetCostUnits,
            q.workEnvelopeLimit,
        )
        receipts.push(receipt)
        totalCellsExpanded += receipt.cellsExpanded
        if (!receipt.ok) {
            allOk = false
        }
    }

    const batchQueryPreImage = {
        overlayHash: overlay.overlayHash,
        queries,
        topologyHash: manifest.topologyHash,
    }
    const batchQueryHash = crypto
        .createHash('sha256')
        .update(canonicalizeJson(batchQueryPreImage))
        .digest('hex')

    const batchReceiptPreImage = {
        allOk,
        receipts: receipts.map((r) => r.receiptHash),
        totalCellsExpanded,
    }
    const batchReceiptHash = crypto
        .createHash('sha256')
        .update(canonicalizeJson(batchReceiptPreImage))
        .digest('hex')

    const cryptographicQuadruple: SpatialReceiptMetadata = Object.freeze({
        schemaVersion: 1,
        kernelVersion: adapter.kernelVersion,
        topologyHash: manifest.topologyHash,
        overlayHash: overlay.overlayHash,
        queryHash: batchQueryHash,
        receiptHash: batchReceiptHash,
    })

    return Object.freeze({
        ok: allOk,
        receipts: Object.freeze(receipts),
        totalCellsExpanded,
        batchQueryHash,
        batchReceiptHash,
        cryptographicQuadruple,
    })
}
