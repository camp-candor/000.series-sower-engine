import clone from "clone-deep";
import * as Act from "./envelope.action";
import { EnvelopeModel } from "./envelope.model";
import * as Buzz from "./envelope.buzzer";
import State from "../99.core/state";

export function reducer(model: EnvelopeModel = new EnvelopeModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_ENVELOPE:
 return Buzz.updateEnvelope(clone(model), act.bale, state);

 case Act.INIT_ENVELOPE:
 return Buzz.initEnvelope(clone(model), act.bale, state);

 default:
 return model;
 }
}
