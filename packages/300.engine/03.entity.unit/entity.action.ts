/**
 * 03.entity.unit - Entity Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type EntityBit from './fce/entity.bit.js'

export const INIT_ENTITY = '[Entity action] Init Entity'
export class InitEntity implements Action {
    readonly type = INIT_ENTITY
    constructor(public bale?: EntityBit) {}
}

export const UPDATE_ENTITY = '[Entity action] Update Entity'
export class UpdateEntity implements Action {
    readonly type = UPDATE_ENTITY
    constructor(public bale?: EntityBit) {}
}

export const ASSEMBLE_ENTITY = '[Entity action] Assemble Entity'
export class AssembleEntity implements Action {
    readonly type = ASSEMBLE_ENTITY
    constructor(public bale?: EntityBit) {}
}

export const UPSERT_ENTITY_LIVE = '[Entity action] Upsert Entity Live'
export class UpsertEntityLive implements Action {
    readonly type = UPSERT_ENTITY_LIVE
    constructor(public bale?: EntityBit) {}
}

export const GET_ENTITY_LIVE = '[Entity action] Get Entity Live'
export class GetEntityLive implements Action {
    readonly type = GET_ENTITY_LIVE
    constructor(public bale?: EntityBit) {}
}

export const LIST_ENTITIES_BY_LOCATION =
    '[Entity action] List Entities By Location'
export class ListEntitiesByLocation implements Action {
    readonly type = LIST_ENTITIES_BY_LOCATION
    constructor(public bale?: EntityBit) {}
}

export const HYDRATE_ALL_ENTITIES = '[Entity action] Hydrate All Entities'
export class HydrateAllEntities implements Action {
    readonly type = HYDRATE_ALL_ENTITIES
    constructor(public bale?: EntityBit) {}
}

export type Actions =
    | InitEntity
    | UpdateEntity
    | AssembleEntity
    | UpsertEntityLive
    | GetEntityLive
    | ListEntitiesByLocation
    | HydrateAllEntities
