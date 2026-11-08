/**
 * 19.wounds.unit - Wounds Bit Payload Contracts
 */
import type {
    WoundRecord,
    SomaticMask,
    KineticAuditQuery,
    KineticAuditReceipt,
} from './wounds.interface.js'
import type { LocomotionTier } from '../../18.trauma.unit/fce/trauma.interface.js'

export interface WoundsPayload {
    readonly entityId?: string
    readonly wound?: WoundRecord
    readonly wounds?: readonly WoundRecord[]
    readonly mask?: SomaticMask
    readonly auditQuery?: KineticAuditQuery
    readonly auditReceipt?: KineticAuditReceipt
    readonly armsAvailable?: number
    readonly legsAvailable?: number
    readonly locomotionTier?: LocomotionTier
    readonly timestampMs?: number
    readonly error?: string
}

export default interface WoundsBit {
    idx: string
    src?: string
    val?: number
    dat?: WoundsPayload
    slv?: Function
}
