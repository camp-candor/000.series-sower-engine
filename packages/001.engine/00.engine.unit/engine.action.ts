import type { Action } from '../99.core/interface/action.interface.js'
import type EngineBit from './fce/engine.bit.js'

export const INIT_ENGINE = '[Engine action] Init Engine'
export class InitEngine implements Action<EngineBit> {
    readonly type = INIT_ENGINE
    constructor(public bale: EngineBit) {}
}

export const UPDATE_ENGINE = '[Engine action] Update Engine'
export class UpdateEngine implements Action<EngineBit> {
    readonly type = UPDATE_ENGINE
    constructor(public bale: EngineBit) {}
}

export const AUDIT_ENGINE = '[Engine action] Audit Engine'
export class AuditEngine implements Action<EngineBit> {
    readonly type = AUDIT_ENGINE
    constructor(public bale: EngineBit) {}
}

export type Actions = InitEngine | UpdateEngine | AuditEngine
