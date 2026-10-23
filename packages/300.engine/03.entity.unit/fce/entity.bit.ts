export default interface EntityBit<TDat = unknown, TLst = unknown> {
    idx: string
    src?: string
    lst?: TLst[]
    val?: number
    dat?: TDat
    slv?: (result: { entBit: Partial<EntityBit<TDat, TLst>> }) => void
}
