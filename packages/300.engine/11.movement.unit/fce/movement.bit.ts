export default interface MovementBit<TDat = unknown, TLst = unknown> {
    idx: string
    src?: string
    lst?: TLst[]
    val?: number
    dat?: TDat
    slv?: (result: { movBit: Partial<MovementBit<TDat, TLst>> }) => void
}
