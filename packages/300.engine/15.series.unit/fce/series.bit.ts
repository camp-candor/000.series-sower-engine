import type { SeriesStorageAllocation } from './series.interface.js'

export default interface SeriesBit {
    idx: string
    src?: string
    val?: number
    dat?: {
        seriesSlug?: string
        targetPath?: string
        useMemory?: boolean
        allocation?: SeriesStorageAllocation
        timestampMs?: number
        [key: string]: any
    }
    slv?: Function
}
