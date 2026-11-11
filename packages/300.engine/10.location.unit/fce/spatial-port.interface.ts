/**
 * 10.location.unit - Synchronous SpatialPort Client Interface Contracts
 * Pure geometric oracle contract operating strictly inside the host V8 isolate.
 */

import type {
    PackedAxial,
    SpatialOverlaySnapshot,
} from './spatial-overlay.interface.js'

export interface TopologyManifest {
    readonly topologyHash: string
    readonly bounds: {
        readonly minQ: number
        readonly maxQ: number
        readonly minR: number
        readonly maxR: number
    }
    readonly blockedCells: ReadonlySet<PackedAxial>
    readonly portalEdges: ReadonlyMap<
        string,
        {
            readonly from: PackedAxial
            readonly to: PackedAxial
            readonly occluderId?: string
        }
    >
    readonly cellAcousticDampingCdB: ReadonlyMap<PackedAxial, number>
    readonly ambientNoiseFloorCdB: number
}

export interface SpatialReceiptMetadata {
    readonly schemaVersion: number
    readonly kernelVersion: string
    readonly topologyHash: string
    readonly overlayHash: string
    readonly queryHash: string
    readonly receiptHash: string
}

export interface PathReceipt extends SpatialReceiptMetadata {
    readonly ok: boolean
    readonly origin: PackedAxial
    readonly destination: PackedAxial
    readonly path: readonly PackedAxial[]
    readonly totalCostUnits: number // Integer centiseconds
    readonly cellsExpanded: number
    readonly failureReason?: 'OCCLUDED' | 'BUDGET_EXCEEDED' | 'UNREACHABLE'
}

export interface PerceptCandidate extends SpatialReceiptMetadata {
    readonly channel: 'VISUAL' | 'AUDITORY'
    readonly sourceCell: PackedAxial
    readonly observerCell: PackedAxial
    readonly signalCdB: number // Integer centi-decibels
    readonly ambientNoiseCdB: number
    readonly snrMarginCdB: number // signalCdB - ambientNoiseCdB
    readonly bearingDegrees: number | null // 0..359 relative or null if colocated
    readonly isOccluded: boolean
}

export interface DisplacementResult extends SpatialReceiptMetadata {
    readonly ok: boolean
    readonly originCell: PackedAxial
    readonly resolvedCell: PackedAxial
    readonly traversalCost: number
    readonly failureReason?:
        | 'CAPACITY_EXHAUSTED'
        | 'BUDGET_EXCEEDED'
        | 'UNREACHABLE'
}

export interface SpatialPort {
    readonly kernelVersion: string

    findPath(
        topology: TopologyManifest,
        overlay: SpatialOverlaySnapshot,
        origin: PackedAxial,
        destination: PackedAxial,
        maxBudgetCostUnits: number,
        workEnvelopeLimit?: number,
    ): PathReceipt

    evaluatePerception(
        topology: TopologyManifest,
        overlay: SpatialOverlaySnapshot,
        sourceCell: PackedAxial,
        observerCell: PackedAxial,
        emissionEnergyCdB: number,
    ): PerceptCandidate

    resolveDisplacement(
        topology: TopologyManifest,
        overlay: SpatialOverlaySnapshot,
        targetCell: PackedAxial,
        occupiedCellCounts: ReadonlyMap<PackedAxial, number>,
        maxCellCapacity: number,
        maxBudgetCostUnits: number,
    ): DisplacementResult
}
