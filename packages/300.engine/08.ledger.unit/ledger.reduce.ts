/**
 * 08.ledger.unit - Ledger Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './ledger.action.js'
import { LedgerModel } from './ledger.model.js'
import * as Buzz from './ledger.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: LedgerModel = new LedgerModel(),
    act: Act.Actions,
    state?: State,
): LedgerModel | Promise<LedgerModel> {
    switch (act.type) {
        case Act.INIT_LEDGER:
            return Buzz.initLedger(clone(model), act.bale, state)

        case Act.UPDATE_LEDGER:
            return Buzz.updateLedger(clone(model), act.bale, state)

        case Act.STAGE_MUTATION_LEDGER:
            return Buzz.stageMutationAction(clone(model), act.bale as any, state)

        case Act.COMMIT_STAGING_LEDGER:
            return Buzz.commitStagingAction(clone(model), act.bale as any, state)

        case Act.ROLLBACK_STAGING_LEDGER:
            return Buzz.rollbackStagingAction(clone(model), act.bale as any, state)

        case Act.VALIDATE_STAGING_LEDGER:
            return Buzz.validateStagingLedgerAction(clone(model), act.bale as any, state)

        case Act.QUERY_STAGING_STATE:
            return Buzz.queryStagingStateAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}
