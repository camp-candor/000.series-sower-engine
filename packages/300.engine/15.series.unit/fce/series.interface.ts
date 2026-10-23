export interface SeriesRoutingResolution {
    seriesSlug: string
    dbPath: string
    isMemory: boolean
    resolvedAt: string
}

export default interface Series {
    idx: string
    activeSeriesSlug: string
    activeDbPath: string
    availableSeries: string[]
}
