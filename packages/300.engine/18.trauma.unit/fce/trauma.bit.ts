/**
 * 18.trauma.unit - Trauma Bit Payload Contracts
 */
import type {
    SomaticTraumaState,
    TraumaDeltaPayload,
    RefusalStrainReport,
} from './trauma.interface.js'

export interface TraumaPayload {
    readonly entityId?: string
    readonly state?: SomaticTraumaState
    readonly delta?: TraumaDeltaPayload
    readonly refusalReport?: RefusalStrainReport
    readonly decayBps?: number
    readonly timestampMs?: number
    readonly error?: string
}

export default interface TraumaBit {
    idx: string
    src?: string
    val?: number
    dat?: TraumaPayload
    slv?: Function
}
