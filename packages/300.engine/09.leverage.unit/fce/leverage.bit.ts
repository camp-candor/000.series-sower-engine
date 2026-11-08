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
    readonly debtorId?: string
    readonly relationId?: string
    readonly mutateParams?: MutateLeverageParams
    readonly spendParams?: SpendLeverageParams
    readonly record?: StringsLedgerRecord
    readonly records?: readonly StringsLedgerRecord[]
    readonly spendReceipt?: LeverageSpendReceipt
    readonly auditReport?: LeverageAuditReport
    readonly rowCount?: number
    readonly timestampMs?: number
    readonly error?: string
}

export default interface LeverageBit {
    idx: string
    src?: string
    val?: number
    dat?: LeveragePayload
    lst?: readonly StringsLedgerRecord[]
    slv?: Function
}
