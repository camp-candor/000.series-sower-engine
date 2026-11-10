import type SeriesBit from './series.bit.js'

export interface SeriesStorageAllocation {
    seriesSlug: string
    storageTarget: string
    isMemoryOnly: boolean
    resolvedAtMs: number
}

export default interface Series {
    idx: string
    activeSeriesSlug?: string
    activeStorageTarget?: string
    allocations?: Record<string, SeriesStorageAllocation>
    seriesBits?: Record<string, SeriesBit>
}
