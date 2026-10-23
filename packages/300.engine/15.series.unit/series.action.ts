import type { Action } from '../99.core/interface/action.interface'
import type SeriesBit from './fce/series.bit'

export const INIT_SERIES = '[Series action] Init Series'
export class InitSeries implements Action<SeriesBit> {
    readonly type = INIT_SERIES
    constructor(public bale: SeriesBit) {}
}

export const UPDATE_SERIES = '[Series action] Update Series'
export class UpdateSeries implements Action<SeriesBit> {
    readonly type = UPDATE_SERIES
    constructor(public bale: SeriesBit) {}
}

export const SELECT_SERIES = '[Series action] Select Series'
export class SelectSeries implements Action<SeriesBit> {
    readonly type = SELECT_SERIES
    constructor(public bale: SeriesBit) {}
}

export const RESOLVE_SERIES_DB_PATH = '[Series action] Resolve Series Db Path'
export class ResolveSeriesDbPath implements Action<SeriesBit> {
    readonly type = RESOLVE_SERIES_DB_PATH
    constructor(public bale: SeriesBit) {}
}

export const LIST_AVAILABLE_SERIES = '[Series action] List Available Series'
export class ListAvailableSeries implements Action<SeriesBit> {
    readonly type = LIST_AVAILABLE_SERIES
    constructor(public bale: SeriesBit) {}
}

export type Actions =
    | InitSeries
    | UpdateSeries
    | SelectSeries
    | ResolveSeriesDbPath
    | ListAvailableSeries
