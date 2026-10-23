import clone from 'clone-deep'
import * as Act from './paranoia.action'
import { ParanoiaModel } from './paranoia.model'
import * as Buzz from './paranoia.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: ParanoiaModel = new ParanoiaModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_PARANOIA:
            return Buzz.initParanoia(clone(model, true), act.bale, state!)

        case Act.UPDATE_PARANOIA:
            return Buzz.updateParanoia(clone(model, true), act.bale, state!)

        case Act.UPSERT_CLOCK_PARANOIA:
            return Buzz.upsertClockParanoia(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.TICK_CLOCK_PARANOIA:
            return Buzz.tickClockParanoia(clone(model, true), act.bale, state!)

        case Act.DECAY_CLOCK_PARANOIA:
            return Buzz.decayClockParanoia(clone(model, true), act.bale, state!)

        case Act.SWEEP_BOIL_OVER_PARANOIA:
            return Buzz.sweepBoilOverParanoia(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.RESET_CLOCK_PARANOIA:
            return Buzz.resetClockParanoia(clone(model, true), act.bale, state!)

        default:
            return model
    }
}
