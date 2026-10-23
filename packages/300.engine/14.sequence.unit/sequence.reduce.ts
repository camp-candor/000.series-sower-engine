import clone from 'clone-deep'
import * as Act from './sequence.action'
import { SequenceModel } from './sequence.model'
import * as Buzz from './sequence.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: SequenceModel = new SequenceModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_SEQUENCE:
            return Buzz.initSequence(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.UPDATE_SEQUENCE:
            return Buzz.updateSequence(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.NEXT_SEQUENCE:
            return Buzz.nextSequence(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.ASSERT_EXPECTED_SEQ:
            return Buzz.assertExpectedSeq(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.VERIFY_SEQUENCE_CONTINUITY:
            return Buzz.verifySequenceContinuity(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.COMMIT_SEQUENCE:
            return Buzz.commitSequence(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.RESET_SEQUENCE:
            return Buzz.resetSequence(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}
