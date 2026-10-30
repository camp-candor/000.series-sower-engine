import { Action } from '../99.core/interface/action.interface.js'
import EngineBit from './fce/engine.bit.js'

// engine actions

export const INIT_ENGINE = '[Engine action] Init Engine'
export class InitEngine implements Action {
    readonly type = INIT_ENGINE
    constructor(public bale: EngineBit) {}
}

export const UPDATE_ENGINE = '[Engine action] Update Engine'
export class UpdateEngine implements Action {
    readonly type = UPDATE_ENGINE
    constructor(public bale: EngineBit) {}
}

export const TEST_ENGINE = '[Test action] Test Engine'
export class TestEngine implements Action {
    readonly type = TEST_ENGINE
    constructor(public bale: EngineBit) {}
}

export const INTELLECT_ENGINE = '[Intellect action] Intellect Engine'
export class IntellectEngine implements Action {
    readonly type = INTELLECT_ENGINE
    constructor(public bale: EngineBit) {}
}

export const VISION_ENGINE = '[Vision action] Vision Engine'
export class VisionEngine implements Action {
    readonly type = VISION_ENGINE
    constructor(public bale: EngineBit) {}
}

export const LIST_ENGINE = '[List action] List Engine'
export class ListEngine implements Action {
    readonly type = LIST_ENGINE
    constructor(public bale: EngineBit) {}
}

export const AUDIT_FENCE = '[Fence action] Audit Fence'
export class AuditFence implements Action {
    readonly type = AUDIT_FENCE
    constructor(public bale: EngineBit) {}
}

export const CHECK_ARTIFACTS = '[Fence action] Check Artifacts'
export class CheckArtifacts implements Action {
    readonly type = CHECK_ARTIFACTS
    constructor(public bale: EngineBit) {}
}

export const AUDIT_BOUNDARY = '[Boundary action] Audit Boundary'
export class AuditBoundary implements Action {
    readonly type = AUDIT_BOUNDARY
    constructor(public bale: EngineBit) {}
}

export const PROFILE_BUDGET = '[Budget action] Profile Budget'
export class ProfileBudget implements Action {
    readonly type = PROFILE_BUDGET
    constructor(public bale: EngineBit) {}
}

export const STEP_TICK = '[Tick action] Step 1 Tick'
export class StepTick implements Action {
    readonly type = STEP_TICK
    constructor(public bale: EngineBit) {}
}

export const FAST_FORWARD_TICKS = '[Tick action] Fast Forward 100 Ticks'
export class FastForwardTicks implements Action {
    readonly type = FAST_FORWARD_TICKS
    constructor(public bale: EngineBit) {}
}

export const ARITHMETIC_AUDIT = '[Arithmetic action] Arithmetic Kernel Audit'
export class ArithmeticAudit implements Action {
    readonly type = ARITHMETIC_AUDIT
    constructor(public bale: EngineBit) {}
}

export const BANKERS_ROUNDING_SUITE =
    '[Arithmetic action] Execute Banker Rounding Suite'
export class BankersRoundingSuite implements Action {
    readonly type = BANKERS_ROUNDING_SUITE
    constructor(public bale: EngineBit) {}
}

export const CHAIN_AUDIT =
    '[Arithmetic action] Run 100,000 Boundary Tie-Break Gauntlet'
export class ChainAudit implements Action {
    readonly type = CHAIN_AUDIT
    constructor(public bale: EngineBit) {}
}

export const DIVISION_AUDIT =
    '[Arithmetic action] Arbitrary Integer Division Suite'
export class DivisionAudit implements Action {
    readonly type = DIVISION_AUDIT
    constructor(public bale: EngineBit) {}
}

export const BIGINT_AUDIT = '[Arithmetic action] Execute BigInt Precision Suite'
export class BigIntAudit implements Action {
    readonly type = BIGINT_AUDIT
    constructor(public bale: EngineBit) {}
}

export type Actions =
    | InitEngine
    | UpdateEngine
    | TestEngine
    | IntellectEngine
    | VisionEngine
    | ListEngine
    | AuditFence
    | CheckArtifacts
    | AuditBoundary
    | ProfileBudget
    | StepTick
    | FastForwardTicks
    | ArithmeticAudit
    | BankersRoundingSuite
    | ChainAudit
    | DivisionAudit
    | BigIntAudit
