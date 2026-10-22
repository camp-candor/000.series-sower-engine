import type { Action } from '../99.core/interface/action.interface'
import type EnvelopeBit from './fce/envelope.bit'

export const INIT_ENVELOPE = '[Envelope action] Init Envelope'
export class InitEnvelope implements Action<EnvelopeBit> {
    readonly type = INIT_ENVELOPE
    constructor(public bale: EnvelopeBit) {}
}

export const UPDATE_ENVELOPE = '[Envelope action] Update Envelope'
export class UpdateEnvelope implements Action<EnvelopeBit> {
    readonly type = UPDATE_ENVELOPE
    constructor(public bale: EnvelopeBit) {}
}

export const CANONICALIZE_ENVELOPE = '[Envelope action] Canonicalize Envelope'
export class CanonicalizeEnvelope implements Action<EnvelopeBit> {
    readonly type = CANONICALIZE_ENVELOPE
    constructor(public bale: EnvelopeBit) {}
}

export const SEAL_EVENT_ENVELOPE = '[Envelope action] Seal Event Envelope'
export class SealEventEnvelope implements Action<EnvelopeBit> {
    readonly type = SEAL_EVENT_ENVELOPE
    constructor(public bale: EnvelopeBit) {}
}

export const HASH_STATE_ENVELOPE = '[Envelope action] Hash State Envelope'
export class HashStateEnvelope implements Action<EnvelopeBit> {
    readonly type = HASH_STATE_ENVELOPE
    constructor(public bale: EnvelopeBit) {}
}

export const VERIFY_CHAIN_ENVELOPE = '[Envelope action] Verify Chain Envelope'
export class VerifyChainEnvelope implements Action<EnvelopeBit> {
    readonly type = VERIFY_CHAIN_ENVELOPE
    constructor(public bale: EnvelopeBit) {}
}

export const VALIDATE_SPATIAL_PROOF = '[Envelope action] Validate Spatial Proof'
export class ValidateSpatialProof implements Action<EnvelopeBit> {
    readonly type = VALIDATE_SPATIAL_PROOF
    constructor(public bale: EnvelopeBit) {}
}

export type Actions =
    | InitEnvelope
    | UpdateEnvelope
    | CanonicalizeEnvelope
    | SealEventEnvelope
    | HashStateEnvelope
    | VerifyChainEnvelope
    | ValidateSpatialProof
