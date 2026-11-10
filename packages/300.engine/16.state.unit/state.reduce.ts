import clone from 'clone-deep';
import * as ActSte from './state.action.js';
import { StateModel } from './state.model.js';
import * as Buzz from './state.buzzer.js';
import type StateBit from './fce/state.bit.js';
import type State from '../99.core/state.js';

export const reducer = async (
  model: StateModel = new StateModel(),
  action: string,
  bit: StateBit,
  ste: State,
): Promise<StateModel> => {
  const cpy = clone(model);
  switch (action) {
    case ActSte.INIT_STATE:
      return await Buzz.initState(cpy, bit, ste);
    case ActSte.UPDATE_STATE:
      return await Buzz.updateState(cpy, bit, ste);
    case ActSte.HYDRATE_STATE:
      return await Buzz.hydrateState(cpy, bit, ste);
    case ActSte.FREEZE_STATE:
      return Buzz.freezeStateAction(cpy, bit, ste);
    case ActSte.GET_STATE:
      return Buzz.getStateAction(cpy, bit, ste);
    case ActSte.WHY_DIRTY_STATE:
      return Buzz.whyDirtyStateAction(cpy, bit, ste);
    default:
      return cpy;
  }
};

export default reducer;

