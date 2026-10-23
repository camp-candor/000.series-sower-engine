import type { Action } from '../99.core/interface/action.interface'
import type WoundsBit from './fce/wounds.bit'

export const INIT_WOUNDS = '[Wounds action] Init Wounds'
export class InitWounds implements Action<WoundsBit> {
    readonly type = INIT_WOUNDS
    constructor(public bale: WoundsBit) {}
}

export const UPDATE_WOUNDS = '[Wounds action] Update Wounds'
export class UpdateWounds implements Action<WoundsBit> {
    readonly type = UPDATE_WOUNDS
    constructor(public bale: WoundsBit) {}
}

export const ADD_WOUND = '[Wounds action] Add Wound'
export class AddWound implements Action<WoundsBit> {
    readonly type = ADD_WOUND
    constructor(public bale: WoundsBit) {}
}

export const COMPUTE_SOMATIC_MASK_WOUNDS =
    '[Wounds action] Compute Somatic Mask Wounds'
export class ComputeSomaticMaskWounds implements Action<WoundsBit> {
    readonly type = COMPUTE_SOMATIC_MASK_WOUNDS
    constructor(public bale: WoundsBit) {}
}

export const ASSERT_KINETIC_VERBS_WOUNDS =
    '[Wounds action] Assert Kinetic Verbs Wounds'
export class AssertKineticVerbsWounds implements Action<WoundsBit> {
    readonly type = ASSERT_KINETIC_VERBS_WOUNDS
    constructor(public bale: WoundsBit) {}
}

export type Actions =
    | InitWounds
    | UpdateWounds
    | AddWound
    | ComputeSomaticMaskWounds
    | AssertKineticVerbsWounds
