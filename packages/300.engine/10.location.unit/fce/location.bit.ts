export default interface LocationBit<TDat = unknown, TLst = unknown> {
    idx: string
    src?: string
    lst?: TLst[]
    val?: number
    dat?: TDat
    slv?: (result: { locBit: Partial<LocationBit<TDat, TLst>> }) => void
}
