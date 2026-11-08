/**
 * 18.trauma.unit - Trauma Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './trauma.action.js'
import { TraumaModel } from './trauma.model.js'
import * as Buzz from './trauma.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: TraumaModel = new TraumaModel(),
    act: Act.Actions,
    state?: State,
): TraumaModel | Promise<TraumaModel> {
    switch (act.type) {
        case Act.INIT_TRAUMA:
            return Buzz.initTrauma(clone(model), act.bale, state)

        case Act.UPDATE_TRAUMA:
            return Buzz.updateTrauma(clone(model), act.bale, state)

        case Act.APPLY_TRAUMA:
            return Buzz.applyTraumaAction(clone(model), act.bale as any, state)

        case Act.DECAY_FATIGUE_TRAUMA:
            return Buzz.decayFatigueTraumaAction(clone(model), act.bale as any, state)

        case Act.CLAMP_BASIS_POINTS_TRAUMA:
            return Buzz.clampBasisPointsTraumaAction(clone(model), act.bale as any, state)

        case Act.GET_SOMATIC_STATE:
            return Buzz.getSomaticStateAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}
