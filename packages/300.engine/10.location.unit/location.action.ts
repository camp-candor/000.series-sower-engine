/**
 * 10.location.unit - Location Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type LocationBit from './fce/location.bit.js'

export const INIT_LOCATION = '[Location action] Init Location'
export class InitLocation implements Action<LocationBit> {
    readonly type = INIT_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const UPDATE_LOCATION = '[Location action] Update Location'
export class UpdateLocation implements Action<LocationBit> {
    readonly type = UPDATE_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const REGISTER_LOCATION = '[Location action] Register Location'
export class RegisterLocation implements Action<LocationBit> {
    readonly type = REGISTER_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const SET_PORTAL_LOCK = '[Location action] Set Portal Lock'
export class SetPortalLock implements Action<LocationBit> {
    readonly type = SET_PORTAL_LOCK
    constructor(public bale?: LocationBit) {}
}

export const VALIDATE_ADJACENCY = '[Location action] Validate Adjacency'
export class ValidateAdjacency implements Action<LocationBit> {
    readonly type = VALIDATE_ADJACENCY
    constructor(public bale?: LocationBit) {}
}

export const CHECK_PORTAL_CROSSING = '[Location action] Check Portal Crossing'
export class CheckPortalCrossing implements Action<LocationBit> {
    readonly type = CHECK_PORTAL_CROSSING
    constructor(public bale?: LocationBit) {}
}

export const TRAVERSE_LOCATION = '[Location action] Traverse Location'
export class TraverseLocation implements Action<LocationBit> {
    readonly type = TRAVERSE_LOCATION
    constructor(public bale?: LocationBit) {}
}

export const AUDIT_TOPOLOGY = '[Location action] Audit Topology'
export class AuditTopology implements Action<LocationBit> {
    readonly type = AUDIT_TOPOLOGY
    constructor(public bale?: LocationBit) {}
}

export const BIND_SPATIAL_PORT = '[Location action] Bind Spatial Port'
export class BindSpatialPort implements Action<LocationBit> {
    readonly type = BIND_SPATIAL_PORT
    constructor(public bale?: LocationBit) {}
}

export const EVALUATE_SPATIAL_PATH = '[Location action] Evaluate Spatial Path'
export class EvaluateSpatialPath implements Action<LocationBit> {
    readonly type = EVALUATE_SPATIAL_PATH
    constructor(public bale?: LocationBit) {}
}

export const EVALUATE_SPATIAL_PERCEPTION =
    '[Location action] Evaluate Spatial Perception'
export class EvaluateSpatialPerception implements Action<LocationBit> {
    readonly type = EVALUATE_SPATIAL_PERCEPTION
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
    | BindSpatialPort
    | EvaluateSpatialPath
    | EvaluateSpatialPerception
