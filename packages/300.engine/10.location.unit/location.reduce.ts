import clone from "clone-deep";
import * as Act from "./location.action";
import { LocationModel } from "./location.model";
import * as Buzz from "./location.buzzer";
import State from "../99.core/state";

export function reducer(model: LocationModel = new LocationModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_LOCATION:
 return Buzz.updateLocation(clone(model), act.bale, state);

 case Act.INIT_LOCATION:
 return Buzz.initLocation(clone(model), act.bale, state);

 default:
 return model;
 }
}
