import clone from "clone-deep";
import * as Act from "./event.action";
import { EventModel } from "./event.model";
import * as Buzz from "./event.buzzer";
import State from "../99.core/state";

export function reducer(model: EventModel = new EventModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_EVENT:
 return Buzz.updateEvent(clone(model), act.bale, state);

 case Act.INIT_EVENT:
 return Buzz.initEvent(clone(model), act.bale, state);

 default:
 return model;
 }
}
