import type { Action } from '../99.core/interface/action.interface'
import type LocationBit from './fce/location.bit'

export const INIT_LOCATION = '[Location action] Init Location'
export class InitLocation implements Action<LocationBit> {
    readonly type = INIT_LOCATION
    constructor(public bale: LocationBit) {}
}

export const UPDATE_LOCATION = '[Location action] Update Location'
export class UpdateLocation implements Action<LocationBit> {
    readonly type = UPDATE_LOCATION
    constructor(public bale: LocationBit) {}
}

export const REGISTER_LOCATION = '[Location action] Register Location'
export class RegisterLocation implements Action<LocationBit> {
    readonly type = REGISTER_LOCATION
    constructor(public bale: LocationBit) {}
}

export const SET_PORTAL_STATE_LOCATION =
    '[Location action] Set Portal State Location'
export class SetPortalStateLocation implements Action<LocationBit> {
    readonly type = SET_PORTAL_STATE_LOCATION
    constructor(public bale: LocationBit) {}
}

export const VALIDATE_CAPACITY_LOCATION =
    '[Location action] Validate Capacity Location'
export class ValidateCapacityLocation implements Action<LocationBit> {
    readonly type = VALIDATE_CAPACITY_LOCATION
    constructor(public bale: LocationBit) {}
}

export type Actions =
    | InitLocation
    | UpdateLocation
    | RegisterLocation
    | SetPortalStateLocation
    | ValidateCapacityLocation
