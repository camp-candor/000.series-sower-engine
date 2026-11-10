/**
 * 98.menu.unit - Menu Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './menu.action.js'
import { MenuModel } from './menu.model.js'
import * as Buzz from './menu.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: MenuModel = new MenuModel(),
    act: Act.Actions,
    state?: State,
): MenuModel | Promise<MenuModel> {
    switch (act.type) {
        case Act.INIT_MENU:
            return Buzz.initMenu(clone(model), act.bale, state)

        case Act.UPDATE_MENU:
            return Buzz.updateMenu(clone(model), act.bale, state)

        case Act.SWITCH_FLIGHT_DECK_MODE:
            return Buzz.switchFlightDeckMode(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.SELECT_MENU_OPTION:
            return Buzz.selectMenuOptionAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.OPEN_ARITHMETIC_MENU:
            return Buzz.updateArithmeticMenu(
                clone(model),
                act.bale as any,
                state,
            )

        default:
            return model
    }
}
