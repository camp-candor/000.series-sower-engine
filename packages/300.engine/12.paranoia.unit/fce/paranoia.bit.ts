/**
 * 12.paranoia.unit - Paranoia Bit Payload Contracts
 */
import type {
    ParanoiaClockState,
    ClockTickParams,
    ThermodynamicImpulseParams,
    ThermodynamicFlowReceipt,
    ThermodynamicAuditReport,
    ClockDispatchTrigger,
    ClockDispatchResult,
} from './paranoia.interface.js'

export interface ParanoiaPayload {
    readonly clock?: ParanoiaClockState
    readonly clocks?: readonly ParanoiaClockState[]
    readonly tickParams?: ClockTickParams
    readonly impulseParams?: ThermodynamicImpulseParams
    readonly flowReceipt?: ThermodynamicFlowReceipt
    readonly flowReceipts?: readonly ThermodynamicFlowReceipt[]
    readonly auditReport?: ThermodynamicAuditReport
    readonly dispatchTrigger?: ClockDispatchTrigger
    readonly dispatchResult?: ClockDispatchResult
    readonly clockId?: string
    readonly entityId?: string
    readonly isTriggered?: boolean
    readonly rowCount?: number
    readonly error?: string
    readonly timestampMs?: number
}

export default interface ParanoiaBit {
    idx: string
    src?: string
    val?: number
    dat?: ParanoiaPayload
    lst?: readonly ParanoiaClockState[]
    slv?: Function
}
