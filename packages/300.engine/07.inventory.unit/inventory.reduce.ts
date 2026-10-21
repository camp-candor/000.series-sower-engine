import clone from "clone-deep";
import * as Act from "./inventory.action";
import { InventoryModel } from "./inventory.model";
import * as Buzz from "./inventory.buzzer";
import State from "../99.core/state";

export function reducer(model: InventoryModel = new InventoryModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_INVENTORY:
 return Buzz.updateInventory(clone(model), act.bale, state);

 case Act.INIT_INVENTORY:
 return Buzz.initInventory(clone(model), act.bale, state);

 default:
 return model;
 }
}
