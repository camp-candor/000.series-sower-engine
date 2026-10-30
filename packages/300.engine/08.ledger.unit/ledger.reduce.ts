import clone from 'clone-deep'
import * as Act from './ledger.action.js'
import { LedgerModel } from './ledger.model.js'
import * as Buzz from './ledger.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: LedgerModel = new LedgerModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_LEDGER:
            return Buzz.updateLedger(clone(model), act.bale, state as State)

        case Act.INIT_LEDGER:
            return Buzz.initLedger(clone(model), act.bale, state as State)

        default:
            return model
    }
}
