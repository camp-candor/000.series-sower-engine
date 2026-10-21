import { Action } from "../99.core/interface/action.interface";
import  LeverageBit  from "./fce/leverage.bit";

// Leverage actions

export const INIT_LEVERAGE = "[Leverage action] Init Leverage";
export class InitLeverage implements Action {
 readonly type = INIT_LEVERAGE;
 constructor(public bale: LeverageBit) {}
}

export const UPDATE_LEVERAGE = "[Leverage action] Update Leverage";
export class UpdateLeverage implements Action {
 readonly type = UPDATE_LEVERAGE;
 constructor(public bale: LeverageBit) {}
}

export type Actions = | InitLeverage | UpdateLeverage ;
