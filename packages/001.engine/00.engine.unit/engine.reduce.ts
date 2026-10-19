import clone from 'clone-deep'
import * as Act from './engine.action.js'
import { EngineModel } from './engine.model.js'
import * as Buzz from './engine.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: EngineModel = new EngineModel(),
    act: Act.Actions,
    state: State | any,
) {
    switch (act.type) {
        case Act.INIT_ENGINE:
            return Buzz.initEngine(clone(model), act.bale, state)

        case Act.UPDATE_ENGINE:
            return Buzz.updateEngine(clone(model), act.bale, state)

        case Act.AUDIT_ENGINE:
            return Buzz.auditEngine(clone(model), act.bale, state)

        default:
            return model
    }
}
