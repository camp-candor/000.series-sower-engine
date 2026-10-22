import clone from 'clone-deep'
import * as Act from './envelope.action'
import { EnvelopeModel } from './envelope.model'
import * as Buzz from './envelope.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: EnvelopeModel = new EnvelopeModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_ENVELOPE:
            return Buzz.initEnvelope(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.UPDATE_ENVELOPE:
            return Buzz.updateEnvelope(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.CANONICALIZE_ENVELOPE:
            return Buzz.canonicalizeEnvelopeAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.SEAL_EVENT_ENVELOPE:
            return Buzz.sealEventEnvelopeAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.HASH_STATE_ENVELOPE:
            return Buzz.hashStateEnvelopeAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.VERIFY_CHAIN_ENVELOPE:
            return Buzz.verifyChainEnvelopeAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        case Act.VALIDATE_SPATIAL_PROOF:
            return Buzz.validateSpatialProofAction(
                clone(model, true),
                act.bale,
                state as State,
            )

        default:
            return model
    }
}
