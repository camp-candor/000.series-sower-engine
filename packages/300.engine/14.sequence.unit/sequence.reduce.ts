/**
 * 14.sequence.unit - Sequence Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './sequence.action.js'
import { SequenceModel } from './sequence.model.js'
import * as Buzz from './sequence.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: SequenceModel = new SequenceModel(),
    act: Act.Actions,
    state?: State,
): SequenceModel | Promise<SequenceModel> {
    switch (act.type) {
        case Act.INIT_SEQUENCE:
            return Buzz.initSequence(clone(model), act.bale, state)

        case Act.UPDATE_SEQUENCE:
            return Buzz.updateSequence(clone(model), act.bale, state)

        case Act.NEXT_SEQUENCE:
            return Buzz.nextSequence(clone(model), act.bale, state)

        case Act.ASSERT_EXPECTED_SEQ:
            return Buzz.assertExpectedSeq(clone(model), act.bale as any, state)

        case Act.COMMIT_SEQUENCE:
            return Buzz.commitSequence(clone(model), act.bale as any, state)

        case Act.VERIFY_SEQUENCE_CONTINUITY:
            return Buzz.verifySequenceContinuity(
                clone(model),
                act.bale as any,
                state,
            )

        default:
            return model
    }
}
