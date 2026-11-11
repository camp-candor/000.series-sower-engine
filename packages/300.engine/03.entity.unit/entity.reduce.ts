/**
 * 03.entity.unit - Entity Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './entity.action.js'
import { EntityModel } from './entity.model.js'
import * as Buzz from './entity.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: EntityModel = new EntityModel(),
    act: Act.Actions,
    state?: State,
): EntityModel | Promise<EntityModel> {
    switch (act.type) {
        case Act.INIT_ENTITY:
            return Buzz.initEntity(clone(model), act.bale, state)

        case Act.UPDATE_ENTITY:
            return Buzz.updateEntity(clone(model), act.bale, state)

        case Act.ASSEMBLE_ENTITY:
            return Buzz.assembleEntityAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.UPSERT_ENTITY_LIVE:
            return Buzz.upsertEntityLiveAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.GET_ENTITY_LIVE:
            return Buzz.getEntityLiveAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.LIST_ENTITIES_BY_LOCATION:
            return Buzz.listEntitiesByLocationAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.HYDRATE_ALL_ENTITIES:
            return Buzz.hydrateAllEntitiesAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.DERIVE_SOMATIC_BUDGET: {
            const state = Buzz.extractSomaticState(
                (act.bale?.dat as any)?.entityState,
            )
            const receipt = Buzz.deriveSomaticBudget(state)
            if (act.bale?.slv) {
                act.bale.slv({
                    entBit: {
                        idx: 'derive-somatic-budget',
                        dat: receipt as any,
                    },
                })
            }
            return model
        }

        case Act.VALIDATE_HAND_CAPACITY: {
            const result = Buzz.validateHandCapacity(
                (act.bale?.dat as any)?.availableArms ?? 0,
                (act.bale?.dat as any)?.heldItems ?? [],
            )
            if (act.bale?.slv) {
                act.bale.slv({
                    entBit: {
                        idx: 'validate-hand-capacity',
                        val: result.valid ? 1 : 0,
                        dat: result as any,
                    },
                })
            }
            return model
        }

        default:
            return model
    }
}
