import { Action } from '../99.core/interface/action.interface.js'
import SeriesBit from './fce/series.bit.js'

// Series actions

export const INIT_SERIES = '[Series action] Init Series'
export class InitSeries implements Action {
    readonly type = INIT_SERIES
    constructor(public bale: SeriesBit) {}
}

export const UPDATE_SERIES = '[Series action] Update Series'
export class UpdateSeries implements Action {
    readonly type = UPDATE_SERIES
    constructor(public bale: SeriesBit) {}
}

export type Actions =
    | InitSeries
    | UpdateSeries
    | ResolveSeriesStorage
    | GetActiveSeries

export const RESOLVE_SERIES_STORAGE = '[Series action] Resolve Series Storage'
export class ResolveSeriesStorage implements Action {
    readonly type = RESOLVE_SERIES_STORAGE
    constructor(public bale: SeriesBit) {}
}

export const GET_ACTIVE_SERIES = '[Series action] Get Active Series'
export class GetActiveSeries implements Action {
    readonly type = GET_ACTIVE_SERIES
    constructor(public bale: SeriesBit) {}
}
