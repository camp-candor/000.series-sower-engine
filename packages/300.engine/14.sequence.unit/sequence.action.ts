import { Action } from "../99.core/interface/action.interface";
import  SequenceBit  from "./fce/sequence.bit";

// Sequence actions

export const INIT_SEQUENCE = "[Sequence action] Init Sequence";
export class InitSequence implements Action {
 readonly type = INIT_SEQUENCE;
 constructor(public bale: SequenceBit) {}
}

export const UPDATE_SEQUENCE = "[Sequence action] Update Sequence";
export class UpdateSequence implements Action {
 readonly type = UPDATE_SEQUENCE;
 constructor(public bale: SequenceBit) {}
}

export type Actions = | InitSequence | UpdateSequence ;
