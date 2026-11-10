import clone from 'clone-deep'
import * as Act from './primordial.action.js'
import { PrimordialModel } from './primordial.model.js'
import * as Buzz from './primordial.buzzer.js'
import type PrimordialBit from './fce/primordial.bit.js'
import type State from '../99.core/state.js'

export const reducePrimordial = async (
    model: PrimordialModel = new PrimordialModel(),
    action: string,
    bit: PrimordialBit,
    ste: State,
): Promise<PrimordialModel> => {
    const cpy = clone(model)
    switch (action) {
        case Act.INIT_PRIMORDIAL:
            return await Buzz.initPrimordial(cpy, bit, ste)
        case Act.UPDATE_PRIMORDIAL:
            return await Buzz.updatePrimordial(cpy, bit, ste)
        case Act.COMPUTE_HROOT_PRIMORDIAL:
            return Buzz.computeHrootPrimordialAction(cpy, bit, ste)
        case Act.SEED_PRIMORDIAL:
            return await Buzz.seedPrimordialAction(cpy, bit, ste)
        case Act.VERIFY_GENESIS_PRIMORDIAL:
            return await Buzz.verifyGenesisPrimordialAction(cpy, bit, ste)
        default:
            return cpy
    }
}

export default reducePrimordial
