'use server'

import * as Import from './BEE.js'
import State from './99.core/state.js'

let instance: any = null

var sim: {
    hunt: (typ: any, obj?: any) => Promise<any>
    state: any
} = {
    hunt: async (_typ: any, _obj?: any) => {},
    state: null,
}

sim.hunt = (typ: any, obj?: any) => {
    return host(obj, typ)
}

var host = (obj: any, typ: any) => {
    init()

    var slv: any
    const promo = new Promise((rslv) => (slv = rslv))

    if (obj == null) obj = {}
    if (obj.slv == null) obj.slv = (val0: any) => slv(val0)

    sim.state.dispatch({ type: typ, bale: obj })
    return promo
}

var init = () => {
    if (!instance) {
        if (sim.state != null) return
        sim.state = new State()
        sim.state.pivot = sim
        sim.state.hunt = sim.hunt
        for (var k in Import.list) new (Import.list as any)[k](sim.state)
        instance = sim
    }

    return instance
}

export const engine = async (typ: any, obj?: any) => {
    return sim.hunt(typ, obj)
}
