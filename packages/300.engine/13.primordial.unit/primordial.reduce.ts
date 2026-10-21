import clone from "clone-deep";
import * as Act from "./primordial.action";
import { PrimordialModel } from "./primordial.model";
import * as Buzz from "./primordial.buzzer";
import State from "../99.core/state";

export function reducer(model: PrimordialModel = new PrimordialModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_PRIMORDIAL:
 return Buzz.updatePrimordial(clone(model), act.bale, state);

 case Act.INIT_PRIMORDIAL:
 return Buzz.initPrimordial(clone(model), act.bale, state);

 default:
 return model;
 }
}
