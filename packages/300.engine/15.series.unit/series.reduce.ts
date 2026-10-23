import clone from 'clone-deep'
import * as Act from './series.action'
import { SeriesModel } from './series.model'
import * as Buzz from './series.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: SeriesModel = new SeriesModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_SERIES:
            return Buzz.initSeries(clone(model, true), act.bale, state as State)

        case Act.UPDATE_SERIES:
            return Buzz.updateSeries(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.SELECT_SERIES:
            return Buzz.selectSeries(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.RESOLVE_SERIES_DB_PATH:
            return Buzz.resolveSeriesDbPath(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.LIST_AVAILABLE_SERIES:
            return Buzz.listAvailableSeries(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}
