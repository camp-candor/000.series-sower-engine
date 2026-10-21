import { Action } from "../99.core/interface/action.interface";
import  PrimordialBit  from "./fce/primordial.bit";

// Primordial actions

export const INIT_PRIMORDIAL = "[Primordial action] Init Primordial";
export class InitPrimordial implements Action {
 readonly type = INIT_PRIMORDIAL;
 constructor(public bale: PrimordialBit) {}
}

export const UPDATE_PRIMORDIAL = "[Primordial action] Update Primordial";
export class UpdatePrimordial implements Action {
 readonly type = UPDATE_PRIMORDIAL;
 constructor(public bale: PrimordialBit) {}
}

export type Actions = | InitPrimordial | UpdatePrimordial ;
