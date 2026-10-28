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

export type Actions =
    | InitEngine
    | UpdateEngine
    | TestEngine
    | IntellectEngine
    | VisionEngine
    | ListEngine
    | AuditFence
