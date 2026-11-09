import * as Import from './BEE.js'
import State from './99.core/state.js'

var sim: {
    hunt: any
    state: any
} = {
    hunt: null,
    state: null,
}

sim.hunt = (typ: any, obj: any) => {
    return host(obj, typ)
}

var host = (obj: any, typ: any) => {
    init()

    var slv: any
    const promo = new Promise((rslv) => (slv = rslv))

    if (obj == null) obj = {}
    if (obj.slv == null) obj.slv = (val0: any) => slv(val0)

    if (
        typ === '[Console action] Update Console' ||
        typ === '[Console action] Init Console' ||
        typ === '[Console action] Write Console' ||
        typ === '[Close action] Close Terminal'
    ) {
        const lib =
            (globalThis as any).LIBRARY ||
            (typeof global !== 'undefined'
                ? (global as any).LIBRARY
                : undefined)
        if (lib && typeof lib.hunt === 'function') {
            lib.hunt(typ, obj).catch(() => {})
        }
        obj.slv({ cnsBit: { idx: 'console-pass', val: 1 } })
        return promo
    }

    sim.state.dispatch({ type: typ, bale: obj })
    return promo
}

var init = () => {
    if (sim.state != null) return
    sim.state = new State()
    sim.state.pivot = sim
    sim.state.hunt = sim.hunt
    for (var k in Import.list) new (Import.list as any)[k](sim.state)
}

export default sim
