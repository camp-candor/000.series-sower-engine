import type Series from './fce/series.interface'

export class SeriesModel implements Series {
    idx = '15.series'
    activeSeriesSlug = 'default'
    activeDbPath = ':memory:'
    availableSeries: string[] = ['default']
}

export default SeriesModel
