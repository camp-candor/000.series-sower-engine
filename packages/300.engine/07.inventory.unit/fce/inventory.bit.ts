export default interface InventoryBit<TDat = unknown, TLst = unknown> {
    idx: string
    src?: string
    lst?: TLst[]
    val?: number
    dat?: TDat
    slv?: (result: { invBit: Partial<InventoryBit<TDat, TLst>> }) => void
}
