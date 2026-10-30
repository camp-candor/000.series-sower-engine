import { Action } from '../99.core/interface/action.interface.js'
import EntityBit from './fce/entity.bit.js'

// Entity actions

export const INIT_ENTITY = '[Entity action] Init Entity'
export class InitEntity implements Action {
    readonly type = INIT_ENTITY
    constructor(public bale: EntityBit) {}
}

export const UPDATE_ENTITY = '[Entity action] Update Entity'
export class UpdateEntity implements Action {
    readonly type = UPDATE_ENTITY
    constructor(public bale: EntityBit) {}
}

export type Actions = InitEntity | UpdateEntity
