import type Series from './fce/series.interface.js'
import type { SeriesStorageAllocation } from './fce/series.interface.js'
import type SeriesBit from './fce/series.bit.js'

export class SeriesModel implements Series {
    idx = '15.series'
    activeSeriesSlug = ''
    activeStorageTarget = ''
    allocations: Record<string, SeriesStorageAllocation> = {}
    seriesBits: Record<string, SeriesBit> = {}
}

export default SeriesModel
