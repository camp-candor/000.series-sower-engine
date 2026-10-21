import clone from "clone-deep";
import * as Act from "./ledger.action";
import { LedgerModel } from "./ledger.model";
import * as Buzz from "./ledger.buzzer";
import State from "../99.core/state";

export function reducer(model: LedgerModel = new LedgerModel(), act: Act.Actions,  state?: State ) {
 switch (act.type) {
 
 case Act.UPDATE_LEDGER:
 return Buzz.updateLedger(clone(model), act.bale, state);

 case Act.INIT_LEDGER:
 return Buzz.initLedger(clone(model), act.bale, state);

 default:
 return model;
 }
}
