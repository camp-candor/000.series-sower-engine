import clone from "clone-deep";
import * as Act from "./state.action";
import { StateModel } from "./state.model";
import * as Buzz from "./state.buzzer";
import State from "../99.core/state";

export function reducer(model: StateModel = new StateModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_STATE:
 return Buzz.updateState(clone(model), act.bale, state);

 case Act.INIT_STATE:
 return Buzz.initState(clone(model), act.bale, state);

 default:
 return model;
 }
}
