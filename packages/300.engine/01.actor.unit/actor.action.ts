import { Action } from "../99.core/interface/action.interface";
import  ActorBit  from "./fce/actor.bit";

// Actor actions

export const INIT_ACTOR = "[Actor action] Init Actor";
export class InitActor implements Action {
 readonly type = INIT_ACTOR;
 constructor(public bale: ActorBit) {}
}

export const UPDATE_ACTOR = "[Actor action] Update Actor";
export class UpdateActor implements Action {
 readonly type = UPDATE_ACTOR;
 constructor(public bale: ActorBit) {}
}

export type Actions = | InitActor | UpdateActor ;
