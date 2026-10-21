import { Action } from "../99.core/interface/action.interface";
import  EnvelopeBit  from "./fce/envelope.bit";

// Envelope actions

export const INIT_ENVELOPE = "[Envelope action] Init Envelope";
export class InitEnvelope implements Action {
 readonly type = INIT_ENVELOPE;
 constructor(public bale: EnvelopeBit) {}
}

export const UPDATE_ENVELOPE = "[Envelope action] Update Envelope";
export class UpdateEnvelope implements Action {
 readonly type = UPDATE_ENVELOPE;
 constructor(public bale: EnvelopeBit) {}
}

export type Actions = | InitEnvelope | UpdateEnvelope ;
