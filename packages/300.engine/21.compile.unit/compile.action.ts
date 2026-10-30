import { Action } from '../99.core/interface/action.interface.js'
import CompileBit from './fce/compile.bit.js'

// Action constants
export const INIT_COMPILE = '[Compile action] Init Compile'
export const RUN_COMPILE = '[Compile action] Run Complete Gauntlet'
export const PASS1_EVALUATE = '[Compile action] Pass 1 Structural Bounds'
export const PASS2_TRAVERSE = '[Compile action] Pass 2 Relational Topology'
export const PASS3_SEAL = '[Compile action] Pass 3 Deterministic Seal'
export const GATE0_VERIFY = '[Compile action] Gate 0 Verification Audit'

// Action classes
export class InitCompile implements Action {
    readonly type = INIT_COMPILE
    constructor(public bale: CompileBit) {}
}

export class RunCompile implements Action {
    readonly type = RUN_COMPILE
    constructor(public bale: CompileBit) {}
}

export class Pass1Evaluate implements Action {
    readonly type = PASS1_EVALUATE
    constructor(public bale: CompileBit) {}
}

export class Pass2Traverse implements Action {
    readonly type = PASS2_TRAVERSE
    constructor(public bale: CompileBit) {}
}

export class Pass3Seal implements Action {
    readonly type = PASS3_SEAL
    constructor(public bale: CompileBit) {}
}

export class Gate0Verify implements Action {
    readonly type = GATE0_VERIFY
    constructor(public bale: CompileBit) {}
}

export type Actions =
    | InitCompile
    | RunCompile
    | Pass1Evaluate
    | Pass2Traverse
    | Pass3Seal
    | Gate0Verify
