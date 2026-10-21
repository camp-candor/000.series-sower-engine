import clone from "clone-deep";
import * as Act from "./wounds.action";
import { WoundsModel } from "./wounds.model";
import * as Buzz from "./wounds.buzzer";
import State from "../99.core/state";

export function reducer(model: WoundsModel = new WoundsModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_WOUNDS:
 return Buzz.updateWounds(clone(model), act.bale, state);

 case Act.INIT_WOUNDS:
 return Buzz.initWounds(clone(model), act.bale, state);

 default:
 return model;
 }
}
