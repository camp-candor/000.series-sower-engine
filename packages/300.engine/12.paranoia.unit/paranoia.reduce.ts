/**
 * 12.paranoia.unit - Paranoia Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './paranoia.action.js'
import { ParanoiaModel } from './paranoia.model.js'
import * as Buzz from './paranoia.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: ParanoiaModel = new ParanoiaModel(),
    act: Act.Actions,
    state?: State,
): ParanoiaModel | Promise<ParanoiaModel> {
    switch (act.type) {
        case Act.INIT_PARANOIA:
            return Buzz.initParanoia(clone(model), act.bale, state)

        case Act.UPDATE_PARANOIA:
            return Buzz.updateParanoia(clone(model), act.bale, state)

        case Act.TICK_CLOCK:
            return Buzz.tickClockAction(clone(model), act.bale as any, state)

        case Act.DISPATCH_CLOCK:
            return Buzz.dispatchClockAction(clone(model), act.bale as any, state)

        case Act.DECAY_CLOCKS:
            return Buzz.decayClocksAction(clone(model), act.bale as any, state)

        case Act.QUERY_CLOCK_STATE:
            return Buzz.queryClockStateAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}
