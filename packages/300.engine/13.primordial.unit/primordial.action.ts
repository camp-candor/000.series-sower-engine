/**
 * 13.primordial.unit - Primordial Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type PrimordialBit from './fce/primordial.bit.js'

export const INIT_PRIMORDIAL = '[Primordial action] Init Primordial'
export class InitPrimordial implements Action {
    readonly type = INIT_PRIMORDIAL
    constructor(public bale?: PrimordialBit) {}
}

export const UPDATE_PRIMORDIAL = '[Primordial action] Update Primordial'
export class UpdatePrimordial implements Action {
    readonly type = UPDATE_PRIMORDIAL
    constructor(public bale?: PrimordialBit) {}
}

export const SEED_PRIMORDIAL = '[Primordial action] Seed Primordial'
export class SeedPrimordial implements Action {
    readonly type = SEED_PRIMORDIAL
    constructor(public bale?: PrimordialBit) {}
}

export const COMPUTE_HROOT_PRIMORDIAL =
    '[Primordial action] Compute Hroot Primordial'
export class ComputeHrootPrimordial implements Action {
    readonly type = COMPUTE_HROOT_PRIMORDIAL
    constructor(public bale?: PrimordialBit) {}
}

export const VERIFY_GENESIS_PRIMORDIAL =
    '[Primordial action] Verify Genesis Primordial'
export class VerifyGenesisPrimordial implements Action {
    readonly type = VERIFY_GENESIS_PRIMORDIAL
    constructor(public bale?: PrimordialBit) {}
}

export type Actions =
    | InitPrimordial
    | UpdatePrimordial
    | SeedPrimordial
    | ComputeHrootPrimordial
    | VerifyGenesisPrimordial
