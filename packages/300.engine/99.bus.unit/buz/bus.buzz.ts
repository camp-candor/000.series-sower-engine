import * as ActBus from '../../99.bus.unit/bus.action.js'
import * as ActCol from '../../97.collect.unit/collect.action.js'

import { BusModel } from '../bus.model.js'
import BusBit from '../fce/bus.bit.js'
import State from '../../99.core/state.js'
import clone from 'clone-deep'

var lst: any, idx: any, bit: any, dat: any

export const initBus = (cpy: BusModel, bal: BusBit, ste: State) => {
    cpy.actList = []

    if (bal == null) bal = { idx: '' }
    if (bal.lst == null) bal.lst = []

    if (bal.src != null && bal.src.constructor == Array) lst = bal.src

    bal.lst.forEach((a: any) => {
        for (var key in a) {
            cpy.actList.push(a[key])
        }
    })

    ste.bus = (idx: any, dat: any, bit: any) =>
        updateBus(cpy, { idx, dat, bit }, ste)

    if (bal.dat != null) {
        cpy.MQTT = bal.dat
    } else {
        console.log('return promise')
    }

    if (lst == null) {
        if (bal.src != null) cpy.host = bal.src
        cpy.client = cpy.MQTT.connect(cpy.host)
        cpy.client.on('message', (tpc: any, msg: any) => {
            messageBus(cpy, { idx: tpc, src: msg }, ste)
        })
        cpy.client.on('connect', () => {
            console.log(bal.idx + ' connected ' + cpy.host)
            openBus(cpy, { idx: 'init-bus', lst: cpy.actList }, ste)
            if (bal.slv != null) bal.slv({ intBit: { idx: 'init-bus' } })
        })
    } else {
        var complete = (lst: any) => {
            lst.shift()

            if (lst.length != 0) return

            if (bal.slv != null) bal.slv({ intBit: { idx: 'init-bus' } })
        }

        lst.forEach(async (a: any) => {
            bit = await ste.hunt(ActCol.WRITE_COLLECT, {
                idx: a.idx,
                src: a.src,
                bit: ActBus.CREATE_BUS,
            })

            var client = bit.clcBit.dat

            client.on('message', (tpc: any, msg: any) => {
                messageBus(cpy, { idx: tpc, src: msg, bit: a.idx }, ste)
            })
            client.on('connect', () => {
                console.log(a.idx + ' connected ' + a.src)
                openBus(
                    cpy,
                    { idx: 'init-bus', lst: cpy.actList, bit: a.idx },
                    ste,
                )
                complete(lst)
            })
        })
    }

    return cpy
}

export const createBus = (cpy: BusModel, bal: BusBit, _ste: State) => {
    var client = cpy.MQTT.connect(bal.src)
    if (bal.slv != null) bal.slv({ busBit: { idx: 'create-bus', dat: client } })
    return cpy
}

export const openBus = async (cpy: BusModel, bal: BusBit, ste: State) => {
    var out: any[] = []

    bal.lst.forEach((a: any) => {
        if (a == null) return
        if (a.includes == null) return
        if (a.includes('[') && a.includes(']') == false) return
        out.push(a)
    })

    var client = cpy.client

    if (bal.bit != null) {
        bit = await ste.hunt(ActCol.READ_COLLECT, {
            idx: bal.bit,
            bit: ActBus.CREATE_BUS,
        })
        client = bit.clcBit.dat
    }

    out.forEach((a: any) => {
        client.subscribe(a, (err: any) => {
            if (!err) {
                console.log('subscribing ' + a)
            }
        })
    })

    return cpy
}

export const connectBus = (_cpy: BusModel, _bal: BusBit, _ste: State) => {
    // connectBus stub
}

export const messageBus = async (cpy: BusModel, bal: BusBit, ste: State) => {
    if (bal.src != null) dat = bal.src.toString()

    idx = bal.idx
    dat = JSON.parse(dat)

    var client = cpy.client

    if (bal.bit != null) {
        bit = await ste.hunt(ActCol.READ_COLLECT, {
            idx: bal.bit,
            bit: ActBus.CREATE_BUS,
        })
        client = bit.clcBit.dat
    }

    if (idx.includes(cpy.responseSuffix) == true) {
        var responseIDX = bal.idx
        var obj = cpy.promises[responseIDX]

        if (obj.slv != null) obj.slv(dat)

        client.unsubscribe(responseIDX, (err: any) => {
            if (!err) {
                //console.log('hitting ' + responseIDX)
            }
        })
    } else {
        var bit = await ste.hunt(idx, dat)
        var cloneBit = clone(bit)

        for (var key in cloneBit) {
            var itm = cloneBit[key]
            if (itm.dat != null) {
                if (itm.dat.bit != null) itm.dat.bit = null
            }
        }

        client.publish(bal.idx + cpy.responseSuffix, JSON.stringify(cloneBit))
    }

    return cpy
}

//has to return a promise
export const updateBus = async (cpy: BusModel, bal: BusBit, ste: State) => {
    var client = cpy.client

    if (bal.bit != null) {
        bit = await ste.hunt(ActCol.READ_COLLECT, {
            idx: bal.bit,
            bit: ActBus.CREATE_BUS,
        })
        client = bit.clcBit.dat
    }

    if (client == null && bal.bit == null) {
        bit = await ste.hunt(ActCol.FETCH_COLLECT, { bit: ActBus.CREATE_BUS })
        client = bit.clcBit.dat
    }

    var responseIDX = bal.idx + cpy.responseSuffix

    var slv: any
    const promo = new Promise((rslv) => (slv = rslv))

    var obj = { slv: (val0: any) => slv(val0) }

    cpy.promises[responseIDX] = obj

    client.subscribe(responseIDX, (err: any) => {
        if (!err) {
            //console.log('hitting ' + responseIDX)
        }
    })

    client.publish(bal.idx, JSON.stringify(bal.dat))

    return promo
}
