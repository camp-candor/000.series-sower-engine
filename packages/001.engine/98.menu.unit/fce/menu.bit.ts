export default interface MenuBit<TDat = unknown> {
    idx: string
    src?: string
    lst?: string[]
    val?: number
    dat?: TDat
    slv?: (result: { mnuBit: Partial<MenuBit<TDat>> }) => void
}
