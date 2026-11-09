/**
 * 98.menu.unit - Menu Bit Payload Contracts
 */
import type {
    MenuFlightDeckState,
    MenuOptionDescriptor,
} from './menu.interface.js'

export interface MenuPayload {
    readonly selection?: string
    readonly flightDeckState?: MenuFlightDeckState
    readonly options?: readonly MenuOptionDescriptor[]
    readonly timestampMs?: number
    readonly error?: string
}

export default interface MenuBit {
    idx: string
    src?: string
    val?: number
    dat?: MenuPayload | any
    lst?: readonly string[] | any
    slv?: Function
}
