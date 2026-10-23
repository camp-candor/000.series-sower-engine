import clone from 'clone-deep'
import * as Act from './movement.action'
import { MovementModel } from './movement.model'
import * as Buzz from './movement.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: MovementModel = new MovementModel(),
    act: Act.Actions,
    state?: State,
): MovementModel {
    switch (act.type) {
        case Act.INIT_MOVEMENT:
            return Buzz.initMovement(clone(model, true), act.bale, state!)

        case Act.UPDATE_MOVEMENT:
            return Buzz.updateMovement(clone(model, true), act.bale, state!)

        case Act.SET_ACTOR_POSITION_MOVEMENT:
            return Buzz.setActorPositionMovement(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.EVALUATE_MOVE_MOVEMENT:
            Buzz.evaluateMoveMovement(clone(model, true), act.bale, state!)
            return model

        default:
            return model
    }
}
