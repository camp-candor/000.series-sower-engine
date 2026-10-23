import type { Action } from '../99.core/interface/action.interface'
import type EngineBit from './fce/engine.bit'

export const INIT_ENGINE = '[Engine action] Init Engine'
export class InitEngine implements Action<EngineBit> {
    readonly type = INIT_ENGINE
    constructor(public bale: EngineBit) {}
}

export const BOOT_ENGINE = '[Engine action] Boot Engine'
export class BootEngine implements Action<EngineBit> {
    readonly type = BOOT_ENGINE
    constructor(public bale: EngineBit) {}
}

export const UPDATE_ENGINE = '[Engine action] Update Engine'
export class UpdateEngine implements Action<EngineBit> {
    readonly type = UPDATE_ENGINE
    constructor(public bale: EngineBit) {}
}

export const STATUS_ENGINE = '[Engine action] Status Engine'
export class StatusEngine implements Action<EngineBit> {
    readonly type = STATUS_ENGINE
    constructor(public bale: EngineBit) {}
}

export const AUDIT_ENGINE = '[Engine action] Audit Engine'
export class AuditEngine implements Action<EngineBit> {
    readonly type = AUDIT_ENGINE
    constructor(public bale: EngineBit) {}
}

export const RESET_ENGINE = '[Engine action] Reset Engine'
export class ResetEngine implements Action<EngineBit> {
    readonly type = RESET_ENGINE
    constructor(public bale: EngineBit) {}
}

export const TEST_ENGINE = '[Test action] Test Engine'
export class TestEngine implements Action<EngineBit> {
    readonly type = TEST_ENGINE
    constructor(public bale: EngineBit) {}
}

export const LIST_ENGINE = '[List action] List Engine'
export class ListEngine implements Action<EngineBit> {
    readonly type = LIST_ENGINE
    constructor(public bale: EngineBit) {}
}

export type Actions =
    | InitEngine
    | BootEngine
    | UpdateEngine
    | StatusEngine
    | AuditEngine
    | ResetEngine
    | TestEngine
    | ListEngine
