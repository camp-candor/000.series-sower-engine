/**
 * 13.primordial.unit - Primordial Bit Payload Contracts
 */
import type {
    GenesisSeedingResult,
    PrimordialBaselinePayload,
} from './primordial.interface.js'

export interface PrimordialPayload {
    readonly baseline?: PrimordialBaselinePayload
    readonly seriesSlug?: string
    readonly seededAtMs?: number
    readonly result?: GenesisSeedingResult
    readonly hRoot?: string
    readonly error?: string
}

export default interface PrimordialBit {
    idx: string
    src?: string
    val?: number
    dat?: PrimordialPayload
    slv?: Function
}
