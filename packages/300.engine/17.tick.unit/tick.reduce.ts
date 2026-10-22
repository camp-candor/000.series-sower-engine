import clone from 'clone-deep'
import * as Act from './tick.action'
import { TickModel } from './tick.model'
import * as Buzz from './tick.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: TickModel = new TickModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_TICK:
            return Buzz.initTick(clone(model, true), act.bale, state as State)

        case Act.UPDATE_TICK:
            return Buzz.updateTick(clone(model, true), act.bale, state as State)

        case Act.ADVANCE_TICK:
            return Buzz.advanceTickAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.DERIVE_SEED_TICK:
            return Buzz.deriveSeedTickAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.EXECUTE_DECAY_SWEEP_TICK:
            return Buzz.executeDecaySweepTickAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.RESET_TICK:
            return Buzz.resetTick(clone(model, true), act.bale, state as State)

        default:
            return model
    }
}
