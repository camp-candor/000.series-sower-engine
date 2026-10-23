import State from './99.core/state'
import * as Import from './BEE'

let instance: any = null

const sim: any = {
    hunt: null,
    state: null,
}

const host = (obj: any, typ: string) => {
    init()

    let slv: (val?: any) => void
    let rjct: (err?: any) => void
    let settled = false
    const promo = new Promise((resolve, reject) => {
        slv = (val?: any) => {
            if (settled) return
            settled = true
            if (val && Array.isArray(val.rows) && !val.datBit) {
                val.datBit = { idx: 'query-database', lst: val.rows }
            }
            resolve(val)
        }
        rjct = (err?: any) => {
            if (settled) return
            settled = true
            reject(err)
        }
    })

    if (obj == null) obj = {}
    if (obj.slv == null) obj.slv = (val0: any) => slv(val0)
    if (obj.rjct == null) obj.rjct = (err0: any) => rjct(err0)

    if (typ === '[Console action] Update Console') {
        const lib = (globalThis as any).LIBRARY
        if (lib && typeof lib.hunt === 'function') {
            Promise.resolve(lib.hunt(typ, obj))
                .then((res) => obj.slv(res))
                .catch(() => obj.slv({ cnsBit: { idx: 'update-console' } }))
        } else {
            obj.slv({ cnsBit: { idx: 'update-console' } })
        }
        return promo
    }

    let mappedTyp = typ
    if (typ === '[Leverage action] Mutate Leverage') {
        mappedTyp = '[Leverage action] Mutate String Leverage'
    } else if (typ === '[Paranoia action] Decay Paranoia') {
        mappedTyp = '[Paranoia action] Decay Clock Paranoia'
    } else if (typ === '[Paranoia action] Tick Paranoia') {
        mappedTyp = '[Paranoia action] Tick Clock Paranoia'
    } else if (typ === '[Paranoia action] Upsert Paranoia') {
        mappedTyp = '[Paranoia action] Upsert Clock Paranoia'
    }

    sim.state.dispatch({ type: mappedTyp, bale: obj })
    if (!settled && !obj._asyncPending) {
        obj.slv({})
    }
    return promo
}

const init = () => {
    if (sim.state != null) return
    sim.state = new State()
    sim.state.pivot = sim
    sim.state.hunt = sim.hunt
    sim.state.reducedApp = (nextState: any, act: any) => {
        for (const k in Import.reducer) {
            try {
                const res = Import.reducer[k](nextState[k], act, sim.state)
                if (res && typeof res.then === 'function') {
                    if (act?.bale) act.bale._asyncPending = true
                    res.then(
                        (updated: any) => {
                            if (updated !== undefined) nextState[k] = updated
                        },
                        (err: any) => {
                            if (act?.bale?.rjct) act.bale.rjct(err)
                        },
                    )
                } else if (res !== undefined) {
                    nextState[k] = res
                }
            } catch (err) {
                if (act?.bale?.rjct) act.bale.rjct(err)
            }
        }
        return nextState
    }
    for (const k in Import.list) {
        new Import.list[k](sim.state)
    }
    instance = sim
}

sim.hunt = (typ: string, obj?: any) => {
    return host(obj, typ)
}

export default sim
