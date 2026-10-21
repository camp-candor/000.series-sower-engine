import clone from "clone-deep";
import * as Act from "./database.action";
import { DatabaseModel } from "./database.model";
import * as Buzz from "./database.buzzer";
import State from "../99.core/state";

export function reducer(model: DatabaseModel = new DatabaseModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_DATABASE:
 return Buzz.updateDatabase(clone(model), act.bale, state);

 case Act.INIT_DATABASE:
 return Buzz.initDatabase(clone(model), act.bale, state);

 default:
 return model;
 }
}
