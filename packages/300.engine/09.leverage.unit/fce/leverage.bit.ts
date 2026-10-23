import type { StringsLedgerRecord } from './leverage.interface'

export default interface LeverageBit<TDat = any, TLst = StringsLedgerRecord> {
    idx: string
    src?: string
    val?: number
    lst?: TLst[]
    dat?: TDat
    slv?: (result: { levBit: Partial<LeverageBit<any, any>> }) => void
}
