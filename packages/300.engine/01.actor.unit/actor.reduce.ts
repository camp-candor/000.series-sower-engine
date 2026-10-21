import clone from "clone-deep";
import * as Act from "./actor.action";
import { ActorModel } from "./actor.model";
import * as Buzz from "./actor.buzzer";
import State from "../99.core/state";

export function reducer(model: ActorModel = new ActorModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_ACTOR:
 return Buzz.updateActor(clone(model), act.bale, state);

 case Act.INIT_ACTOR:
 return Buzz.initActor(clone(model), act.bale, state);

 default:
 return model;
 }
}
