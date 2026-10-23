import clone from 'clone-deep'
import * as Act from './wounds.action'
import { WoundsModel } from './wounds.model'
import * as Buzz from './wounds.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: WoundsModel = new WoundsModel(),
    act: Act.Actions,
    state?: State,
): WoundsModel {
    switch (act.type) {
        case Act.INIT_WOUNDS:
            return Buzz.initWounds(clone(model, true), act.bale, state!)

        case Act.UPDATE_WOUNDS:
            return Buzz.updateWounds(clone(model, true), act.bale, state!)

        case Act.ADD_WOUND:
            return Buzz.addWound(clone(model, true), act.bale, state!)

        case Act.COMPUTE_SOMATIC_MASK_WOUNDS:
            return Buzz.computeSomaticMaskWounds(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.ASSERT_KINETIC_VERBS_WOUNDS:
            Buzz.assertKineticVerbsWounds(clone(model, true), act.bale, state!)
            return model

        default:
            return model
    }
}
