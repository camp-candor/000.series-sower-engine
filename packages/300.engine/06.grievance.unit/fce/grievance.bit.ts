/**
 * 06.grievance.unit - Grievance Bit Payload Contracts
 */
import type {
    GrievanceRecord,
    UpsertGrievanceParams,
    EscalateGrievanceParams,
    GrievanceFilterQuery,
    Stage3SelectionParams,
    Stage3SelectionReceipt,
    JaccardAuditReport,
} from './grievance.interface.js'

export interface GrievancePayload {
    readonly grievanceId?: string
    readonly instigatorId?: string
    readonly victimId?: string
    readonly record?: GrievanceRecord
    readonly records?: readonly GrievanceRecord[]
    readonly upsertParams?: UpsertGrievanceParams
    readonly escalateParams?: EscalateGrievanceParams
    readonly filterQuery?: GrievanceFilterQuery
    readonly selectionParams?: Stage3SelectionParams
    readonly selectionReceipt?: Stage3SelectionReceipt
    readonly jaccardReport?: JaccardAuditReport
    readonly rowCount?: number
    readonly timestampMs?: number
    readonly error?: string
}

export default interface GrievanceBit {
    idx: string
    src?: string
    val?: number
    dat?: GrievancePayload
    lst?: readonly GrievanceRecord[]
    slv?: Function
}
