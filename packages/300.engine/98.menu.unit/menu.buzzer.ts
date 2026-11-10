/**
 * 98.menu.unit - Menu Buzzer Barrel Export
 */
export {
    initMenu,
    updateMenu,
    switchFlightDeckMode,
    selectMenuOptionAction,
    handleMenuSelection,
    MENU_CHOICES,
} from './buz/00.menu.buzz.js'
export { updateArithmeticMenu } from './buz/arithmetic-menu.buzz.js'
export type {
    FlightDeckMode,
    MenuOptionDescriptor,
    MenuFlightDeckState,
} from './fce/menu.interface.js'
export type { MenuPayload } from './fce/menu.bit.js'
