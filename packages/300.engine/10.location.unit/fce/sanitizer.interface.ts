/**
 * 10.location.unit - Epistemic Sanitizer Interface Contracts
 * Strict plain-data contracts for scrubbed outbound spatial queries.
 */
import type { PackedAxial } from './spatial-overlay.interface.js'

export interface ScrubbedPathQuery {
    readonly originPacked: PackedAxial
    readonly destinationPacked: PackedAxial
    readonly maxBudgetCostUnits: number
    readonly workEnvelopeLimit: number
}

export interface ScrubbedPerceptionQuery {
    readonly sourceCellPacked: PackedAxial
    readonly observerCellPacked: PackedAxial
    readonly emissionEnergyCdB: number
}

export interface QuerySanitizationResult<T> {
    readonly ok: boolean
    readonly scrubbedPayload?: T
    readonly queryHash?: string
    readonly strippedKeys: readonly string[]
    readonly error?: string
}

export interface RawSpatialQueryInput {
    readonly qOrigin?: number
    readonly rOrigin?: number
    readonly qDest?: number
    readonly rDest?: number
    readonly qSource?: number
    readonly rSource?: number
    readonly qObserver?: number
    readonly rObserver?: number
    readonly budget?: number
    readonly workLimit?: number
    readonly energyCdB?: number
    readonly [key: string]: unknown
}
