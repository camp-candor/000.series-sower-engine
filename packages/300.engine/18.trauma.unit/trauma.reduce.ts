import clone from 'clone-deep'
import * as Act from './trauma.action'
import { TraumaModel } from './trauma.model'
import * as Buzz from './trauma.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: TraumaModel = new TraumaModel(),
    act: Act.Actions,
    state?: State,
): TraumaModel {
    switch (act.type) {
        case Act.INIT_TRAUMA:
            return Buzz.initTrauma(clone(model, true), act.bale, state!)

        case Act.UPDATE_TRAUMA:
            return Buzz.updateTrauma(clone(model, true), act.bale, state!)

        case Act.APPLY_TRAUMA:
            return Buzz.applyTrauma(clone(model, true), act.bale, state!)

        case Act.RECOVER_TRAUMA:
            return Buzz.recoverTrauma(clone(model, true), act.bale, state!)

        case Act.EVALUATE_REFUSAL_STRAIN_TRAUMA:
            return Buzz.evaluateRefusalStrainTrauma(
                clone(model, true),
                act.bale,
                state!,
            )

        default:
            return model
    }
}
