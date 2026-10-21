import { Action } from "../99.core/interface/action.interface";
import  DatabaseBit  from "./fce/database.bit";

// Database actions

export const INIT_DATABASE = "[Database action] Init Database";
export class InitDatabase implements Action {
 readonly type = INIT_DATABASE;
 constructor(public bale: DatabaseBit) {}
}

export const UPDATE_DATABASE = "[Database action] Update Database";
export class UpdateDatabase implements Action {
 readonly type = UPDATE_DATABASE;
 constructor(public bale: DatabaseBit) {}
}

export type Actions = | InitDatabase | UpdateDatabase ;
