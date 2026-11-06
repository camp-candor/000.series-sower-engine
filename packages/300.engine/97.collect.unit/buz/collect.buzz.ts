import { createHash } from 'node:crypto'
import { CollectModel } from '../collect.model.js'
import CollectBit from '../fce/collect.bit.js'
import CaboodleBit from '../fce/caboodle.bit.js'
import State from '../../99.core/state.js'

function canonicalize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj)
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(canonicalize).join(',')}]`
    }
    const sortedKeys = Object.keys(obj).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )
    const parts = sortedKeys.map(
        (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
    )
    return `{${parts.join(',')}}`
}

export const initCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    cpy.caboodleBitList = []
    cpy.caboodleBits = {}
    if (bal?.slv) bal.slv({ clcBit: { idx: 'init-collect', val: 0 } })
    return cpy
}

export const updateCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    if (bal?.slv) bal.slv({ clcBit: { idx: 'update-collect', val: 1 } })
    return cpy
}

export const createCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const id = bal.idx || `caboodle-${cpy.caboodleBitList.length}`
    if (!cpy.caboodleBits[id]) {
        const item: CaboodleBit = {
            idx: id,
            dex: 0,
            bitList: [],
            bits: {},
        }
        cpy.caboodleBits[id] = item
        cpy.caboodleBitList.push(item)
    }
    if (bal?.slv)
        bal.slv({
            clcBit: { idx: 'create-collect', dat: cpy.caboodleBits[id] },
        })
    return cpy
}

export const readCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const id = bal.idx || 'default'
    let caboodle = cpy.caboodleBits[id]
    if (!caboodle) {
        caboodle = {
            idx: id,
            dex: 0,
            bitList: [],
            bits: {},
        }
        cpy.caboodleBits[id] = caboodle
        cpy.caboodleBitList.push(caboodle)
    }
    if (bal?.slv) bal.slv({ clcBit: { idx: 'read-collect', dat: caboodle } })
    return cpy
}

export const writeCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const id = bal.idx || 'default'
    let caboodle = cpy.caboodleBits[id]
    if (!caboodle) {
        caboodle = {
            idx: id,
            dex: 0,
            bitList: [],
            bits: {},
        }
        cpy.caboodleBits[id] = caboodle
        cpy.caboodleBitList.push(caboodle)
    }
    if (bal.dat) {
        caboodle.bits = { ...caboodle.bits, ...bal.dat }
    }
    if (bal?.slv) bal.slv({ clcBit: { idx: 'write-collect', dat: caboodle } })
    return cpy
}

export const removeCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const id = bal.idx || ''
    if (cpy.caboodleBits[id]) {
        delete cpy.caboodleBits[id]
        cpy.caboodleBitList = cpy.caboodleBitList.filter((c) => c.idx !== id)
    }
    if (bal?.slv) bal.slv({ clcBit: { idx: 'remove-collect', val: 1 } })
    return cpy
}

export const deleteCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    ste?: State,
): CollectModel => {
    return removeCollect(cpy, bal, ste)
}

export const emptyCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    cpy.caboodleBitList = []
    cpy.caboodleBits = {}
    if (bal?.slv) bal.slv({ clcBit: { idx: 'empty-collect', val: 0 } })
    return cpy
}

export const fetchCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    ste?: State,
): CollectModel => {
    return readCollect(cpy, bal, ste)
}

export const modelCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    if (bal?.slv) bal.slv({ clcBit: { idx: 'model-collect', dat: cpy } })
    return cpy
}

export const getCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const id = bal.idx || ''
    const item = cpy.caboodleBits[id]
    if (bal?.slv) bal.slv({ clcBit: { idx: 'get-collect', dat: item } })
    return cpy
}

export const putCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    ste?: State,
): CollectModel => {
    return writeCollect(cpy, bal, ste)
}

export const formatCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const serialized = canonicalize(cpy.caboodleBits)
    if (bal?.slv)
        bal.slv({ clcBit: { idx: 'format-collect', src: serialized } })
    return cpy
}

export const dotCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    if (bal?.slv) bal.slv({ clcBit: { idx: 'dot-collect', val: 1 } })
    return cpy
}

export const listCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const keys = Object.keys(cpy.caboodleBits).sort()
    if (bal?.slv) bal.slv({ clcBit: { idx: 'list-collect', lst: keys } })
    return cpy
}

export const hashCollect = (
    cpy: CollectModel,
    bal: CollectBit,
    _ste?: State,
): CollectModel => {
    const json = canonicalize(cpy.caboodleBits)
    const hash = createHash('sha256').update(json, 'utf8').digest('hex')
    if (bal?.slv) bal.slv({ clcBit: { idx: 'hash-collect', src: hash } })
    return cpy
}
