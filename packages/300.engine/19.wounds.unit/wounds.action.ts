/**
 * 19.wounds.unit - Wounds Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type WoundsBit from './fce/wounds.bit.js'

export const INIT_WOUNDS = '[Wounds action] Init Wounds'
export class InitWounds implements Action {
    readonly type = INIT_WOUNDS
    constructor(public bale?: WoundsBit) {}
}

export const UPDATE_WOUNDS = '[Wounds action] Update Wounds'
export class UpdateWounds implements Action {
    readonly type = UPDATE_WOUNDS
    constructor(public bale?: WoundsBit) {}
}

export const ADD_WOUND = '[Wounds action] Add Wound'
export class AddWound implements Action {
    readonly type = ADD_WOUND
    constructor(public bale?: WoundsBit) {}
}

export const COMPILE_SOMATIC_MASK_WOUNDS =
    '[Wounds action] Compile Somatic Mask Wounds'
export class CompileSomaticMaskWounds implements Action {
    readonly type = COMPILE_SOMATIC_MASK_WOUNDS
    constructor(public bale?: WoundsBit) {}
}

export const ASSERT_KINETIC_VERBS_WOUNDS =
    '[Wounds action] Assert Kinetic Verbs Wounds'
export class AssertKineticVerbsWounds implements Action {
    readonly type = ASSERT_KINETIC_VERBS_WOUNDS
    constructor(public bale?: WoundsBit) {}
}

export type Actions =
    | InitWounds
    | UpdateWounds
    | AddWound
    | CompileSomaticMaskWounds
    | AssertKineticVerbsWounds
