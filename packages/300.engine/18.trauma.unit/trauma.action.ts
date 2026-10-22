import type { Action } from '../99.core/interface/action.interface'
import type TraumaBit from './fce/trauma.bit'

export const INIT_TRAUMA = '[Trauma action] Init Trauma'
export class InitTrauma implements Action<TraumaBit> {
    readonly type = INIT_TRAUMA
    constructor(public bale: TraumaBit) {}
}

export const UPDATE_TRAUMA = '[Trauma action] Update Trauma'
export class UpdateTrauma implements Action<TraumaBit> {
    readonly type = UPDATE_TRAUMA
    constructor(public bale: TraumaBit) {}
}

export const APPLY_TRAUMA = '[Trauma action] Apply Trauma'
export class ApplyTrauma implements Action<TraumaBit> {
    readonly type = APPLY_TRAUMA
    constructor(public bale: TraumaBit) {}
}

export const RECOVER_TRAUMA = '[Trauma action] Recover Trauma'
export class RecoverTrauma implements Action<TraumaBit> {
    readonly type = RECOVER_TRAUMA
    constructor(public bale: TraumaBit) {}
}

export const EVALUATE_REFUSAL_STRAIN_TRAUMA =
    '[Trauma action] Evaluate Refusal Strain Trauma'
export class EvaluateRefusalStrainTrauma implements Action<TraumaBit> {
    readonly type = EVALUATE_REFUSAL_STRAIN_TRAUMA
    constructor(public bale: TraumaBit) {}
}

export type Actions =
    | InitTrauma
    | UpdateTrauma
    | ApplyTrauma
    | RecoverTrauma
    | EvaluateRefusalStrainTrauma
