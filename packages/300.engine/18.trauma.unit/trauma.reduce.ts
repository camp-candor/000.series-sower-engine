import clone from "clone-deep";
import * as Act from "./trauma.action";
import { TraumaModel } from "./trauma.model";
import * as Buzz from "./trauma.buzzer";
import State from "../99.core/state";

export function reducer(model: TraumaModel = new TraumaModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_TRAUMA:
 return Buzz.updateTrauma(clone(model), act.bale, state);

 case Act.INIT_TRAUMA:
 return Buzz.initTrauma(clone(model), act.bale, state);

 default:
 return model;
 }
}
