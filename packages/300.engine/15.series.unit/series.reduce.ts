import clone from 'clone-deep'
import * as Act from './series.action.js'
import { SeriesModel } from './series.model.js'
import * as Buzz from './series.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: SeriesModel = new SeriesModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_SERIES:
            return Buzz.updateSeries(clone(model), act.bale, state as State)

        case Act.INIT_SERIES:
            return Buzz.initSeries(clone(model), act.bale, state as State)

        default:
            return model
    }
}
