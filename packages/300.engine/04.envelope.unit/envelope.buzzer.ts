/**
 * 04.envelope.unit - Envelope Buzzer Barrel Export
 */
export {
    initEnvelope,
    updateEnvelope,
    canonicalizeEnvelopeAction,
    sealEventEnvelopeAction,
    hashStateEnvelopeAction,
    verifyChainEnvelopeAction,
    validateSpatialProofAction,
    canonicalizeJson,
    sha256Hex,
    isValidSpatialProof,
    computeChainedEventHash,
    computeStateHash,
    verifyHashChain,
} from './buz/envelope.buzz.js'
export {
    GENESIS_HASH_64,
} from './envelope.model.js'
export type {
    EventEnvelope,
    SpatialProof,
    HashChainValidationReport,
    StateHashReceipt,
} from './fce/envelope.interface.js'
export type {
    EnvelopePayload,
} from './fce/envelope.bit.js'
