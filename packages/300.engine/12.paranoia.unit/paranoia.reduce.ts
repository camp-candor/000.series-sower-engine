import clone from "clone-deep";
import * as Act from "./paranoia.action";
import { ParanoiaModel } from "./paranoia.model";
import * as Buzz from "./paranoia.buzzer";
import State from "../99.core/state";

export function reducer(model: ParanoiaModel = new ParanoiaModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_PARANOIA:
 return Buzz.updateParanoia(clone(model), act.bale, state);

 case Act.INIT_PARANOIA:
 return Buzz.initParanoia(clone(model), act.bale, state);

 default:
 return model;
 }
}
