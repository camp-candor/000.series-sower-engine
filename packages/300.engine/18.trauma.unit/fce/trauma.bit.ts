export default interface TraumaBit<TDat = unknown, TLst = unknown> {
    idx: string
    src?: string
    lst?: TLst[]
    val?: number
    dat?: TDat
    slv?: (result: { trmBit: Partial<TraumaBit<TDat, TLst>> }) => void
}
