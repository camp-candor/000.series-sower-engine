import clone from 'clone-deep'
import * as Act from './engine.action.js'
import { EngineModel } from './engine.model.js'
import * as Buzz from './engine.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: EngineModel = new EngineModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.UPDATE_ENGINE:
            return Buzz.updateEngine(clone(model), act.bale, state)

        case Act.INIT_ENGINE:
            return Buzz.initEngine(clone(model), act.bale, state)

        case Act.TEST_ENGINE:
            return Buzz.testEngine(clone(model), act.bale, state)

        case Act.LIST_ENGINE:
            return Buzz.listEngine(clone(model), act.bale, state)

        case Act.AUDIT_FENCE:
            return Buzz.auditFence(clone(model), act.bale, state)

        case Act.CHECK_ARTIFACTS:
            return Buzz.checkArtifacts(clone(model), act.bale, state)

        default:
            return model
    }
}
