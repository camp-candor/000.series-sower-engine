import clone from 'clone-deep'
import * as Act from './location.action'
import { LocationModel } from './location.model'
import * as Buzz from './location.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: LocationModel = new LocationModel(),
    act: Act.Actions,
    state?: State,
): LocationModel {
    switch (act.type) {
        case Act.INIT_LOCATION:
            return Buzz.initLocation(clone(model, true), act.bale, state!)

        case Act.UPDATE_LOCATION:
            return Buzz.updateLocation(clone(model, true), act.bale, state!)

        case Act.REGISTER_LOCATION:
            return Buzz.registerLocation(clone(model, true), act.bale, state!)

        case Act.SET_PORTAL_STATE_LOCATION:
            return Buzz.setPortalStateLocation(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.VALIDATE_CAPACITY_LOCATION:
            Buzz.validateCapacityLocation(clone(model, true), act.bale, state!)
            return model

        default:
            return model
    }
}
