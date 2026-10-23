import type { LedgerWorkingState } from './state.interface'

export default interface StateBit<TDat = unknown, TLst = unknown> {
    idx: string
    src?: string
    val?: number
    lst?: TLst[]
    dat?: TDat
    slv?: (result: { steBit: Partial<StateBit<TDat, TLst>> }) => void
}
