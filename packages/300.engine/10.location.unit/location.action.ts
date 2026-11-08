/**
 * 10.location.unit - Location Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type LocationBit from './fce/location.bit.js'

export const INIT_LOCATION = '[Location action] Init Location'
export class InitLocation implements Action {
    readonly type = INIT_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const UPDATE_LOCATION = '[Location action] Update Location'
export class UpdateLocation implements Action {
    readonly type = UPDATE_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const REGISTER_LOCATION = '[Location action] Register Location'
export class RegisterLocation implements Action {
    readonly type = REGISTER_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const SET_PORTAL_LOCK = '[Location action] Set Portal Lock'
export class SetPortalLock implements Action {
    readonly type = SET_PORTAL_LOCK
    constructor(public bale?: LocationBit) {}
}

export const VALIDATE_ADJACENCY = '[Location action] Validate Adjacency'
export class ValidateAdjacency implements Action {
    readonly type = VALIDATE_ADJACENCY
    constructor(public bale?: LocationBit) {}
}

export const CHECK_PORTAL_CROSSING = '[Location action] Check Portal Crossing'
export class CheckPortalCrossing implements Action {
    readonly type = CHECK_PORTAL_CROSSING
    constructor(public bale?: LocationBit) {}
}

export const TRAVERSE_LOCATION = '[Location action] Traverse Location'
export class TraverseLocation implements Action {
    readonly type = TRAVERSE_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const AUDIT_TOPOLOGY = '[Location action] Audit Topology'
export class AuditTopology implements Action {
    readonly type = AUDIT_TOPOLOGY
    constructor(public bale?: LocationBit) {}
}

export type Actions =
    | InitLocation
    | UpdateLocation
    | RegisterLocation
    | SetPortalLock
    | ValidateAdjacency
    | CheckPortalCrossing
    | TraverseLocation
    | AuditTopology
