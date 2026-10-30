import clone from 'clone-deep'
import * as Act from './tick.action.js'
import { TickModel } from './tick.model.js'
import * as Buzz from './tick.buzzer.js'
import State from '../99.core/state.js'
import {
    type TickStatePayload,
    type TickActorState,
    toSimTime,
} from './fce/tick.interface.js'

export function reduceTickStep(state: TickStatePayload): TickStatePayload {
    const nextTick = toSimTime(state.tick + 1)

    const updatedActors: TickActorState[] = state.actors.map((actor) => {
        // Check if actor has pending actions to process on this tick
        const action = state.pending_actions.find(
            (a) => a.actor_id === actor.id,
        )

        let nextStrain = actor.somatic_strain_bp
        let nextParanoia = actor.paranoia_bp

        if (action) {
            if (action.verb === 'INSPECT' || action.verb === 'SEARCH') {
                nextStrain = Math.min(10000, nextStrain + 25)
                nextParanoia = Math.min(10000, nextParanoia + 50)
            } else if (action.verb === 'REST') {
                nextStrain = Math.max(0, nextStrain - 50)
                nextParanoia = Math.max(0, nextParanoia - 10)
            }
        } else {
            // Passive thermodynamic & somatic decay
            if (nextStrain > 0) nextStrain = Math.max(0, nextStrain - 1)
        }

        return {
            id: actor.id,
            somatic_strain_bp: nextStrain,
            paranoia_bp: nextParanoia,
            current_loc: actor.current_loc,
            busyUntil: actor.busyUntil > nextTick ? actor.busyUntil : nextTick,
        }
    })

    return {
        tick: nextTick,
        actors: updatedActors,
        pending_actions: [],
    }
}

export function reducer(
    model: TickModel = new TickModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_TICK:
            return Buzz.updateTick(clone(model), act.bale, state as State)

        case Act.INIT_TICK:
            return Buzz.initTick(clone(model), act.bale, state as State)

        default:
            return model
    }
}
