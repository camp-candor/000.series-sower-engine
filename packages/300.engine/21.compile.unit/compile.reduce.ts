import clone from 'clone-deep'
import * as Act from './compile.action.js'
import { CompileModel } from './compile.model.js'
import * as Buzz from './compile.buzzer.js'
import State from '../99.core/state.js'

export function reducer(
    model: CompileModel = new CompileModel(),
    act: Act.Actions,
    state?: State,
): CompileModel {
    switch (act.type) {
        case Act.INIT_COMPILE:
            return Buzz.initCompile(clone(model, true), act.bale, state)

        case Act.RUN_COMPILE:
            return Buzz.runCompile(clone(model, true), act.bale, state)

        case Act.PASS1_EVALUATE:
            return Buzz.pass1Evaluate(clone(model, true), act.bale, state)

        case Act.PASS2_TRAVERSE:
            return Buzz.pass2Traverse(clone(model, true), act.bale, state)

        case Act.PASS3_SEAL:
            return Buzz.pass3Seal(clone(model, true), act.bale, state)

        case Act.GATE0_VERIFY:
            return Buzz.gate0Verify(clone(model, true), act.bale, state)

        default:
            return model
    }
}
