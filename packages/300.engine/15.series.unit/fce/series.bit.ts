import type { SeriesRoutingResolution } from './series.interface'

export default interface SeriesBit<TDat = any, TLst = string> {
    idx: string
    src?: string
    val?: number
    dat?: TDat
    lst?: TLst[]
    slv?: (result: {
        srsBit?: Partial<SeriesBit<TDat, TLst>>
        routing?: SeriesRoutingResolution
        lst?: TLst[]
        err?: string
    }) => void
}
