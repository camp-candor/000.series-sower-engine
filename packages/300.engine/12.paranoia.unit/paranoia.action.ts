import { Action } from '../99.core/interface/action.interface.js'
import ParanoiaBit from './fce/paranoia.bit.js'

// Paranoia actions

export const INIT_PARANOIA = '[Paranoia action] Init Paranoia'
export class InitParanoia implements Action {
    readonly type = INIT_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export const UPDATE_PARANOIA = '[Paranoia action] Update Paranoia'
export class UpdateParanoia implements Action {
    readonly type = UPDATE_PARANOIA
    constructor(public bale: ParanoiaBit) {}
}

export type Actions = InitParanoia | UpdateParanoia
