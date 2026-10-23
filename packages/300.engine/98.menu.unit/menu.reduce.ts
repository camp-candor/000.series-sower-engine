import clone from 'clone-deep'
import * as Act from './menu.action'
import { MenuModel } from './menu.model'
import * as Buzz from './menu.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: MenuModel = new MenuModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_MENU:
            return Buzz.initMenu(clone(model, true), act.bale, state as State)

        case Act.UPDATE_MENU:
            return Buzz.updateMenu(clone(model, true), act.bale, state as State)

        default:
            return model
    }
}
