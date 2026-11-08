/**
 * 11.movement.unit - Movement Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './movement.action.js'
import { MovementModel } from './movement.model.js'
import * as Buzz from './movement.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: MovementModel = new MovementModel(),
    act: Act.Actions,
    state?: State,
): MovementModel | Promise<MovementModel> {
    switch (act.type) {
        case Act.INIT_MOVEMENT:
            return Buzz.initMovement(clone(model), act.bale, state)

        case Act.UPDATE_MOVEMENT:
            return Buzz.updateMovement(clone(model), act.bale, state)

        case Act.SET_ACTOR_POSITION:
            return Buzz.setActorPositionAction(clone(model), act.bale as any, state)

        case Act.CALCULATE_DISTANCE:
            return Buzz.calculateDistanceAction(clone(model), act.bale as any, state)

        case Act.ASSERT_INTERACTION_RANGE:
            return Buzz.assertInteractionRangeAction(clone(model), act.bale as any, state)

        case Act.EXECUTE_MOVEMENT:
            return Buzz.executeMovementAction(clone(model), act.bale as any, state)

        case Act.GET_ACTOR_POSITION:
            return Buzz.getActorPositionAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}
