import { Action } from "../99.core/interface/action.interface";
import  GrievanceBit  from "./fce/grievance.bit";

// Grievance actions

export const INIT_GRIEVANCE = "[Grievance action] Init Grievance";
export class InitGrievance implements Action {
 readonly type = INIT_GRIEVANCE;
 constructor(public bale: GrievanceBit) {}
}

export const UPDATE_GRIEVANCE = "[Grievance action] Update Grievance";
export class UpdateGrievance implements Action {
 readonly type = UPDATE_GRIEVANCE;
 constructor(public bale: GrievanceBit) {}
}

export type Actions = | InitGrievance | UpdateGrievance ;
