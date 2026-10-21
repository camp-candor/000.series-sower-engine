import clone from "clone-deep";
import * as Act from "./movement.action";
import { MovementModel } from "./movement.model";
import * as Buzz from "./movement.buzzer";
import State from "../99.core/state";

export function reducer(model: MovementModel = new MovementModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_MOVEMENT:
 return Buzz.updateMovement(clone(model), act.bale, state);

 case Act.INIT_MOVEMENT:
 return Buzz.initMovement(clone(model), act.bale, state);

 default:
 return model;
 }
}
