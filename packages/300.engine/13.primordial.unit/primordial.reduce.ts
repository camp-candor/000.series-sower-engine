import clone from 'clone-deep'
import * as Act from './primordial.action'
import { PrimordialModel } from './primordial.model'
import * as Buzz from './primordial.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: PrimordialModel = new PrimordialModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_PRIMORDIAL:
            return Buzz.initPrimordial(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.UPDATE_PRIMORDIAL:
            return Buzz.updatePrimordial(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.COMPUTE_HROOT_PRIMORDIAL:
            return Buzz.computeHrootPrimordialAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.SEED_PRIMORDIAL:
            return Buzz.seedPrimordialAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.VERIFY_GENESIS_PRIMORDIAL:
            return Buzz.verifyGenesisPrimordialAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}
