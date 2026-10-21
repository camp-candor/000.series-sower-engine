import clone from "clone-deep";
import * as Act from "./grievance.action";
import { GrievanceModel } from "./grievance.model";
import * as Buzz from "./grievance.buzzer";
import State from "../99.core/state";

export function reducer(model: GrievanceModel = new GrievanceModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_GRIEVANCE:
 return Buzz.updateGrievance(clone(model), act.bale, state);

 case Act.INIT_GRIEVANCE:
 return Buzz.initGrievance(clone(model), act.bale, state);

 default:
 return model;
 }
}
