import clone from "clone-deep";
import * as Act from "./sequence.action";
import { SequenceModel } from "./sequence.model";
import * as Buzz from "./sequence.buzzer";
import State from "../99.core/state";

export function reducer(model: SequenceModel = new SequenceModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_SEQUENCE:
 return Buzz.updateSequence(clone(model), act.bale, state);

 case Act.INIT_SEQUENCE:
 return Buzz.initSequence(clone(model), act.bale, state);

 default:
 return model;
 }
}
