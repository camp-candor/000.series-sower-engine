/**
 * 19.wounds.unit - Wounds Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './wounds.action.js'
import { WoundsModel } from './wounds.model.js'
import * as Buzz from './wounds.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: WoundsModel = new WoundsModel(),
    act: Act.Actions,
    state?: State,
): WoundsModel | Promise<WoundsModel> {
    switch (act.type) {
        case Act.INIT_WOUNDS:
            return Buzz.initWounds(clone(model), act.bale, state)

        case Act.UPDATE_WOUNDS:
            return Buzz.updateWounds(clone(model), act.bale, state)

        case Act.ADD_WOUND:
            return Buzz.addWoundAction(clone(model), act.bale as any, state)

        case Act.COMPILE_SOMATIC_MASK_WOUNDS:
            return Buzz.compileSomaticMaskWoundsAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.ASSERT_KINETIC_VERBS_WOUNDS:
            return Buzz.assertKineticVerbsWoundsAction(
                clone(model),
                act.bale as any,
                state,
            )

        default:
            return model
    }
}
