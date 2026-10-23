import type { Action } from '../99.core/interface/action.interface'
import type EntityBit from './fce/entity.bit'

export const INIT_ENTITY = '[Entity action] Init Entity'
export class InitEntity implements Action<EntityBit> {
    readonly type = INIT_ENTITY
    constructor(public bale: EntityBit) {}
}

export const UPDATE_ENTITY = '[Entity action] Update Entity'
export class UpdateEntity implements Action<EntityBit> {
    readonly type = UPDATE_ENTITY
    constructor(public bale: EntityBit) {}
}

export const UPSERT_ENTITY = '[Entity action] Upsert Entity'
export class UpsertEntity implements Action<EntityBit> {
    readonly type = UPSERT_ENTITY
    constructor(public bale: EntityBit) {}
}

export const GET_ENTITY = '[Entity action] Get Entity'
export class GetEntity implements Action<EntityBit> {
    readonly type = GET_ENTITY
    constructor(public bale: EntityBit) {}
}

export const LIST_ENTITIES_BY_LOCATION =
    '[Entity action] List Entities By Location'
export class ListEntitiesByLocation implements Action<EntityBit> {
    readonly type = LIST_ENTITIES_BY_LOCATION
    constructor(public bale: EntityBit) {}
}

export const HYDRATE_ALL_ENTITIES = '[Entity action] Hydrate All Entities'
export class HydrateAllEntities implements Action<EntityBit> {
    readonly type = HYDRATE_ALL_ENTITIES
    constructor(public bale: EntityBit) {}
}

export type Actions =
    | InitEntity
    | UpdateEntity
    | UpsertEntity
    | GetEntity
    | ListEntitiesByLocation
    | HydrateAllEntities
