import { CompileModel } from '../compile.model.js'
import CompileBit from '../fce/compile.bit.js'
import State from '../../99.core/state.js'

export const initCompile = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    if (bal.slv) {
        bal.slv({ cmpBit: { idx: 'init-compile' } })
    }
    return cpy
}

export const runCompile = (cpy: CompileModel, bal: CompileBit, ste?: State) => {
    void ste
    if (bal.slv) {
        bal.slv({ cmpBit: { idx: 'run-compile' } })
    }
    return cpy
}

export const pass1Evaluate = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    if (bal.slv) {
        bal.slv({ cmpBit: { idx: 'pass1-shape-eval' } })
    }
    return cpy
}

export const pass2Traverse = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    if (bal.slv) {
        bal.slv({ cmpBit: { idx: 'pass2-relational-sweep' } })
    }
    return cpy
}

export const pass3Seal = (cpy: CompileModel, bal: CompileBit, ste?: State) => {
    void ste
    if (bal.slv) {
        bal.slv({ cmpBit: { idx: 'pass3-deterministic-seal' } })
    }
    return cpy
}

export const gate0Verify = (
    cpy: CompileModel,
    bal: CompileBit,
    ste?: State,
) => {
    void ste
    if (bal.slv) {
        bal.slv({ cmpBit: { idx: 'gate0-verify' } })
    }
    return cpy
}
