/**
 * 13.primordial.unit - Primordial Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './primordial.action.js'
import { PrimordialModel } from './primordial.model.js'
import * as Buzz from './primordial.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: PrimordialModel = new PrimordialModel(),
    act: Act.Actions,
    state?: State,
): PrimordialModel | Promise<PrimordialModel> {
    switch (act.type) {
        case Act.INIT_PRIMORDIAL:
            return Buzz.initPrimordial(clone(model), act.bale, state)

        case Act.UPDATE_PRIMORDIAL:
            return Buzz.updatePrimordial(clone(model), act.bale, state)

        case Act.COMPUTE_HROOT_PRIMORDIAL:
            return Buzz.computeHrootPrimordialAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.SEED_PRIMORDIAL:
            return Buzz.seedPrimordialAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.VERIFY_GENESIS_PRIMORDIAL:
            return Buzz.verifyGenesisPrimordialAction(
                clone(model),
                act.bale as any,
                state,
            )

        default:
            return model
    }
}
