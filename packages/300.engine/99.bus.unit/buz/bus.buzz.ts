import { BusModel } from '../bus.model.js'
import BusBit from '../fce/bus.bit.js'
import State from '../../99.core/state.js'

export const initBus = (cpy: BusModel, bal: BusBit, _ste?: State): BusModel => {
    cpy.promises = {}
    if (bal?.slv) bal.slv({ busBit: { idx: 'init-bus', val: 1 } })
    return cpy
}

export const updateBus = (
    cpy: BusModel,
    bal: BusBit,
    _ste?: State,
): BusModel => {
    if (bal?.slv) bal.slv({ busBit: { idx: 'update-bus', val: 1 } })
    return cpy
}

export const openBus = (cpy: BusModel, bal: BusBit, _ste?: State): BusModel => {
    if (bal?.slv) bal.slv({ busBit: { idx: 'open-bus', val: 1 } })
    return cpy
}

export const connectBus = (
    cpy: BusModel,
    bal: BusBit,
    _ste?: State,
): BusModel => {
    if (bal?.slv) bal.slv({ busBit: { idx: 'connect-bus', val: 1 } })
    return cpy
}

export const messageBus = async (
    cpy: BusModel,
    bal: BusBit,
    ste?: State,
): Promise<BusModel> => {
    if (ste && bal.src) {
        const actionType = bal.src
        const payload = bal.dat ?? {}
        const result = await ste.hunt(actionType, payload)
        if (bal?.slv) bal.slv({ busBit: { idx: 'message-bus', dat: result } })
    } else {
        if (bal?.slv) bal.slv({ busBit: { idx: 'message-bus', val: 0 } })
    }
    return cpy
}

export const createBus = (
    cpy: BusModel,
    bal: BusBit,
    _ste?: State,
): BusModel => {
    if (bal?.slv) bal.slv({ busBit: { idx: 'create-bus', val: 1 } })
    return cpy
}
