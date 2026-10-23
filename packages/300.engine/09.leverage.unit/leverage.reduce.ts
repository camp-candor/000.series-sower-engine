import clone from 'clone-deep'
import * as Act from './leverage.action'
import { LeverageModel } from './leverage.model'
import * as Buzz from './leverage.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: LeverageModel = new LeverageModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_LEVERAGE:
            return Buzz.initLeverage(clone(model, true), act.bale, state!)

        case Act.UPDATE_LEVERAGE:
            return Buzz.updateLeverage(clone(model, true), act.bale, state!)

        case Act.MUTATE_STRING_LEVERAGE:
            return Buzz.mutateStringLeverage(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.SPEND_STRING_LEVERAGE:
            return Buzz.spendStringLeverage(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.GET_PAIR_LEVERAGE:
            return Buzz.getPairLeverage(clone(model, true), act.bale, state!)

        case Act.LIST_LEVERAGE:
            return Buzz.listLeverage(clone(model, true), act.bale, state!)

        default:
            return model
    }
}
