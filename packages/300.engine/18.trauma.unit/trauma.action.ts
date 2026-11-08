/**
 * 18.trauma.unit - Trauma Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type TraumaBit from './fce/trauma.bit.js'

export const INIT_TRAUMA = '[Trauma action] Init Trauma'
export class InitTrauma implements Action {
    readonly type = INIT_TRAUMA
    constructor(public bale?: TraumaBit) {}
}

export const UPDATE_TRAUMA = '[Trauma action] Update Trauma'
export class UpdateTrauma implements Action {
    readonly type = UPDATE_TRAUMA
    constructor(public bale?: TraumaBit) {}
}

export const APPLY_TRAUMA = '[Trauma action] Apply Trauma'
export class ApplyTrauma implements Action {
    readonly type = APPLY_TRAUMA
    constructor(public bale?: TraumaBit) {}
}

export const DECAY_FATIGUE_TRAUMA = '[Trauma action] Decay Fatigue Trauma'
export class DecayFatigueTrauma implements Action {
    readonly type = DECAY_FATIGUE_TRAUMA
    constructor(public bale?: TraumaBit) {}
}

export const CLAMP_BASIS_POINTS_TRAUMA =
    '[Trauma action] Clamp Basis Points Trauma'
export class ClampBasisPointsTrauma implements Action {
    readonly type = CLAMP_BASIS_POINTS_TRAUMA
    constructor(public bale?: TraumaBit) {}
}

export const GET_SOMATIC_STATE = '[Trauma action] Get Somatic State'
export class GetSomaticState implements Action {
    readonly type = GET_SOMATIC_STATE
    constructor(public bale?: TraumaBit) {}
}

export type Actions =
    | InitTrauma
    | UpdateTrauma
    | ApplyTrauma
    | DecayFatigueTrauma
    | ClampBasisPointsTrauma
    | GetSomaticState
