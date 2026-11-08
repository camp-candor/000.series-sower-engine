/**
 * 09.leverage.unit - Leverage Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './leverage.action.js'
import { LeverageModel } from './leverage.model.js'
import * as Buzz from './leverage.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: LeverageModel = new LeverageModel(),
    act: Act.Actions,
    state?: State,
): LeverageModel | Promise<LeverageModel> {
    switch (act.type) {
        case Act.INIT_LEVERAGE:
            return Buzz.initLeverage(clone(model), act.bale, state)

        case Act.UPDATE_LEVERAGE:
            return Buzz.updateLeverage(clone(model), act.bale, state)

        case Act.MUTATE_LEVERAGE_STRINGS:
            return Buzz.mutateStringLeverage(clone(model), act.bale as any, state)

        case Act.SPEND_LEVERAGE_STRINGS:
            return Buzz.spendStringLeverage(clone(model), act.bale as any, state)

        case Act.GET_LEVERAGE_RECORD:
            return Buzz.getLeverageRecordAction(clone(model), act.bale as any, state)

        case Act.LIST_LEVERAGE_BY_HOLDER:
            return Buzz.listLeverageByHolderAction(clone(model), act.bale as any, state)

        case Act.AUDIT_LEVERAGE_SOLVENCY:
            return Buzz.auditLeverageSolvencyAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}
