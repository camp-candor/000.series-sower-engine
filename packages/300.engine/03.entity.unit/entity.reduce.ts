import clone from 'clone-deep'
import * as Act from './entity.action'
import { EntityModel } from './entity.model'
import * as Buzz from './entity.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: EntityModel = new EntityModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_ENTITY:
            return Buzz.initEntity(clone(model, true), act.bale, state!)

        case Act.UPDATE_ENTITY:
            return Buzz.updateEntity(clone(model, true), act.bale, state!)

        case Act.UPSERT_ENTITY:
            return Buzz.upsertEntity(clone(model, true), act.bale, state!)

        case Act.GET_ENTITY:
            return Buzz.getEntity(clone(model, true), act.bale, state!)

        case Act.LIST_ENTITIES_BY_LOCATION:
            return Buzz.listEntitiesByLocation(
                clone(model, true),
                act.bale,
                state!,
            ) as any

        case Act.HYDRATE_ALL_ENTITIES:
            return Buzz.hydrateAllEntities(
                clone(model, true),
                act.bale,
                state!,
            ) as any

        default:
            return model
    }
}
