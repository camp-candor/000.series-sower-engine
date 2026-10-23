import type { LedgerWorkingState, EventEnvelope } from './ledger.interface'

export default interface LedgerBit<TDat = unknown, TLst = EventEnvelope> {
    idx: string
    src?: string
    val?: number
    lst?: TLst[]
    dat?: TDat
    slv?: (result: { ldgBit: Partial<LedgerBit<TDat, TLst>> }) => void
}
