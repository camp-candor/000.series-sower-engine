import { Action } from "../99.core/interface/action.interface";
import  TraumaBit  from "./fce/trauma.bit";

// Trauma actions

export const INIT_TRAUMA = "[Trauma action] Init Trauma";
export class InitTrauma implements Action {
 readonly type = INIT_TRAUMA;
 constructor(public bale: TraumaBit) {}
}

export const UPDATE_TRAUMA = "[Trauma action] Update Trauma";
export class UpdateTrauma implements Action {
 readonly type = UPDATE_TRAUMA;
 constructor(public bale: TraumaBit) {}
}

export type Actions = | InitTrauma | UpdateTrauma ;
