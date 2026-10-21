import clone from "clone-deep";
import * as Act from "./leverage.action";
import { LeverageModel } from "./leverage.model";
import * as Buzz from "./leverage.buzzer";
import State from "../99.core/state";

export function reducer(model: LeverageModel = new LeverageModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_LEVERAGE:
 return Buzz.updateLeverage(clone(model), act.bale, state);

 case Act.INIT_LEVERAGE:
 return Buzz.initLeverage(clone(model), act.bale, state);

 default:
 return model;
 }
}
