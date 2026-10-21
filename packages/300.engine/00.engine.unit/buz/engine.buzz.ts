import { EngineModel } from '../engine.model.js'
import EngineBit from '../fce/engine.bit.js'
import State from '../../99.core/state.js'

const engine = {
    list: async () => {
        return { models: [] as any[] }
    },
}

export const initEngine = (cpy: EngineModel, bal: EngineBit, ste: State) => {
    const url =
        process.env.ENGINE_URL ||
        'https://zero00-engine.onrender.com/api/engine/test'
    if (url) {
        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                if (bal.slv != null) {
                    bal.slv({
                        intBit: {
                            idx: 'init-engine',
                            dat: {
                                engine: data,
                            },
                        },
                    })
                }
            })
            .catch((error: any) => {
                if (bal.slv != null) {
                    bal.slv({
                        intBit: { idx: 'init-engine-err', dat: error.message },
                    })
                }
            })
    } else {
        if (bal.slv != null) {
            bal.slv({ intBit: { idx: 'init-engine' } })
        }
    }
    return cpy
}

export const updateEngine = (
    cpy: EngineModel,
    bal: EngineBit,
    ste: State,
) => {
    bal.slv({ intBit: { idx: 'update-engine' } })

    return cpy
}

export const testEngine = (cpy: EngineModel, bal: EngineBit, ste: State) => {
    bal.slv({ mytBit: { idx: 'test-engine', val: 1 } })
    return cpy
}

export const listEngine = async (
    cpy: EngineModel,
    bal: EngineBit,
    ste: State,
) => {
    const response = await engine.list()
    if (bal.slv != null)
        bal.slv({
            olmBit: {
                idx: 'list-engine',
                lst: response.models.map((m: any) => m.name),
            },
        })
    return cpy
}
