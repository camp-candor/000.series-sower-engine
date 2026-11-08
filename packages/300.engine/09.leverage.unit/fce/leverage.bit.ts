/**
 * 09.leverage.unit - Leverage Bit Payload Contracts
 */
import type {
    StringsLedgerRecord,
    MutateLeverageParams,
    SpendLeverageParams,
    LeverageSpendReceipt,
    LeverageAuditReport,
} from './leverage.interface.js'

export interface LeveragePayload {
    readonly holderId?: string
    readonly holder_id?: string
    readonly debtorId?: string
    readonly debtor_id?: string
    readonly relationId?: string
    readonly relation_id?: string
    readonly mutateParams?: MutateLeverageParams
    readonly spendParams?: SpendLeverageParams
    readonly record?: StringsLedgerRecord
    readonly records?: readonly StringsLedgerRecord[]
    readonly spendReceipt?: LeverageSpendReceipt
    readonly auditReport?: LeverageAuditReport
    readonly rowCount?: number
    readonly row_count?: number
    readonly timestampMs?: number
    readonly timestamp_ms?: number
    readonly error?: string
    readonly strings_count?: number
    readonly spend_count?: number
    readonly weight_bps?: number
}

export default interface LeverageBit {
    idx: string
    src?: string
    val?: number
    dat?: LeveragePayload
    lst?: readonly StringsLedgerRecord[]
    slv?: Function
}
