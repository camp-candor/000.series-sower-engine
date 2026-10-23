import clone from 'clone-deep'
import * as Act from './engine.action'
import { EngineModel } from './engine.model'
import * as Buzz from './engine.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: EngineModel = new EngineModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_ENGINE:
            return Buzz.initEngine(clone(model, true), act.bale, state as State)

        case Act.BOOT_ENGINE:
            return Buzz.bootEngine(clone(model, true), act.bale, state as State)

        case Act.UPDATE_ENGINE:
            return Buzz.updateEngine(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.STATUS_ENGINE:
            return Buzz.statusEngine(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.AUDIT_ENGINE:
            return Buzz.auditEngine(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.RESET_ENGINE:
            return Buzz.resetEngine(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}
