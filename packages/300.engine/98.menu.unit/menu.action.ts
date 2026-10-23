import type { Action } from '../99.core/interface/action.interface'
import type MenuBit from './fce/menu.bit'

export const INIT_MENU = '[Menu action] Init Menu'
export class InitMenu implements Action<MenuBit> {
    readonly type = INIT_MENU
    constructor(public bale: MenuBit) {}
}

export const UPDATE_MENU = '[Menu action] Update Menu'
export class UpdateMenu implements Action<MenuBit> {
    readonly type = UPDATE_MENU
    constructor(public bale: MenuBit) {}
}

export type Actions = InitMenu | UpdateMenu
