import { Action } from "../99.core/interface/action.interface";
import  WoundsBit  from "./fce/wounds.bit";

// Wounds actions

export const INIT_WOUNDS = "[Wounds action] Init Wounds";
export class InitWounds implements Action {
 readonly type = INIT_WOUNDS;
 constructor(public bale: WoundsBit) {}
}

export const UPDATE_WOUNDS = "[Wounds action] Update Wounds";
export class UpdateWounds implements Action {
 readonly type = UPDATE_WOUNDS;
 constructor(public bale: WoundsBit) {}
}

export type Actions = | InitWounds | UpdateWounds ;
