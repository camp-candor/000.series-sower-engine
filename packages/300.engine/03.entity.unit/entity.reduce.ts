import clone from "clone-deep";
import * as Act from "./entity.action";
import { EntityModel } from "./entity.model";
import * as Buzz from "./entity.buzzer";
import State from "../99.core/state";

export function reducer(model: EntityModel = new EntityModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_ENTITY:
 return Buzz.updateEntity(clone(model), act.bale, state);

 case Act.INIT_ENTITY:
 return Buzz.initEntity(clone(model), act.bale, state);

 default:
 return model;
 }
}
