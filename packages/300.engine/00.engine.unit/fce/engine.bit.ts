import type { TableStatsReport, EngineAuditReceipt } from './engine.interface'

export default interface EngineBit<TDat = unknown, TLst = unknown> {
    idx?: string
    src?: string
    val?: number
    lst?: TLst[]
    dat?: TDat
    slv?: (result: {
        engBit: Partial<EngineBit<TDat, TLst>>
        report?: TableStatsReport
        receipt?: EngineAuditReceipt
        status?: string
    }) => void
}
