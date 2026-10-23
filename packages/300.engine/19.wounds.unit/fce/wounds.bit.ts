export default interface WoundsBit<TDat = any, TLst = any> {
    idx: string
    src?: string
    lst?: TLst[]
    val?: number
    dat?: TDat
    slv?: (result: { wndBit: Partial<WoundsBit<any, any>> }) => void
}
