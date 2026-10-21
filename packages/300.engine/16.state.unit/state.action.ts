import { Action } from "../99.core/interface/action.interface";
import  StateBit  from "./fce/state.bit";

// State actions

export const INIT_STATE = "[State action] Init State";
export class InitState implements Action {
 readonly type = INIT_STATE;
 constructor(public bale: StateBit) {}
}

export const UPDATE_STATE = "[State action] Update State";
export class UpdateState implements Action {
 readonly type = UPDATE_STATE;
 constructor(public bale: StateBit) {}
}

export type Actions = | InitState | UpdateState ;
