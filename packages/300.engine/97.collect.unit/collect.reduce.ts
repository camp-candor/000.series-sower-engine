import clone from 'clone-deep'
import * as Act from './collect.action.js'
import { CollectModel } from './collect.model.js'
import * as Buzz from './collect.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: CollectModel = new CollectModel(),
    act: Act.Actions | any,
    state?: State,
): CollectModel {
    switch (act.type) {
        case Act.UPDATE_COLLECT:
            return Buzz.updateCollect(clone(model), act.bale, state as State)

        case Act.INIT_COLLECT:
            return Buzz.initCollect(clone(model), act.bale, state as State)

        case Act.READ_COLLECT:
        case '[Read action] Read Collect':
            return Buzz.readCollect(clone(model), act.bale, state as State)

        case Act.WRITE_COLLECT:
        case '[Write action] Write Collect':
            return Buzz.writeCollect(clone(model), act.bale, state as State)

        case Act.CREATE_COLLECT:
        case '[Create action] Create Collect':
            return Buzz.createCollect(clone(model), act.bale, state as State)

        case Act.DELETE_COLLECT:
        case '[Delete action] Delete Collect':
            return Buzz.deleteCollect(clone(model), act.bale, state as State)

        case Act.REMOVE_COLLECT:
        case '[Remove action] Remove Collect':
            return Buzz.removeCollect(clone(model), act.bale, state as State)

        case Act.EMPTY_COLLECT:
        case '[Empty action] Empty Collect':
            return Buzz.emptyCollect(clone(model), act.bale, state as State)

        case Act.FETCH_COLLECT:
        case '[Fetch action] Fetch Collect':
            return Buzz.fetchCollect(clone(model), act.bale, state as State)

        case Act.MODEL_COLLECT:
        case '[Model action] Model Collect':
            return Buzz.modelCollect(clone(model), act.bale, state as State)

        case Act.GET_COLLECT:
        case '[Get action] Get Collect':
            return Buzz.getCollect(clone(model), act.bale, state as State)

        case Act.PUT_COLLECT:
        case '[Put action] Put Collect':
            return Buzz.putCollect(clone(model), act.bale, state as State)

        case Act.FORMAT_COLLECT:
        case '[Format action] Format Collect':
            return Buzz.formatCollect(clone(model), act.bale, state as State)

        case Act.DOT_COLLECT:
        case '[Dot action] Dot Collect':
            return Buzz.dotCollect(clone(model), act.bale, state as State)

        case Act.LIST_COLLECT:
        case '[List action] List Collect':
            return Buzz.listCollect(clone(model), act.bale, state as State)

        case Act.HASH_COLLECT:
        case '[Hash action] Hash Collect':
            return Buzz.hashCollect(clone(model), act.bale, state as State)

        default:
            return model
    }
}
