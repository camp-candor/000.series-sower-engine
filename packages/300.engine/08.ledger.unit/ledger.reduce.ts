import clone from 'clone-deep'
import * as Act from './ledger.action'
import { LedgerModel } from './ledger.model'
import * as Buzz from './ledger.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: LedgerModel = new LedgerModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_LEDGER:
            return Buzz.initLedger(clone(model, true), act.bale, state as State)

        case Act.UPDATE_LEDGER:
            return Buzz.updateLedger(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.REDUCE_LEDGER:
            return Buzz.reduceLedger(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.STAGE_EVENT_LEDGER:
            return Buzz.stageEventLedger(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.VALIDATE_STAGED_LEDGER:
            return Buzz.validateStagedLedger(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.ROLLBACK_STAGED_LEDGER:
            return Buzz.rollbackStagedLedger(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.COMMIT_STAGED_LEDGER:
            return Buzz.commitStagedLedger(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.FOLD_LEDGER_EVENTS:
            return Buzz.foldLedgerEventsBuzz(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}
