/**
 * 98.menu.unit - Menu Bit Payload Contracts
 */
import type {
    CompiledUniverseDescriptor,
    FlightDeckMode,
    MenuFlightDeckState,
    MenuOptionDescriptor,
    MenuMode,
    SpatialProbeTelemetry,
} from './menu.interface.js'

export interface MenuPayload {
    readonly mode?: MenuMode
    readonly choice?: string
    readonly probeTelemetry?: SpatialProbeTelemetry
    readonly originPacked?: number
    readonly destinationPacked?: number
    readonly maxBudgetCostUnits?: number
    readonly workEnvelopeLimit?: number
    readonly message?: string
    readonly selection?: string
    readonly flightDeckMode?: FlightDeckMode
    readonly seriesSlug?: string
    readonly flightDeckState?: MenuFlightDeckState
    readonly options?: readonly MenuOptionDescriptor[]
    readonly timestampMs?: number
    readonly error?: string
}

export default interface MenuBit<TDat = MenuPayload, TLst = string> {
    idx: string
    src?: string
    val?: number
    dat?:
        | TDat
        | {
              discovered?: CompiledUniverseDescriptor[]
              selectedSlug?: string
              targetPath?: string
              [key: string]: any
          }
    lst?: readonly TLst[] | any
    slv?: (result: { mnuBit: Partial<MenuBit<TDat, TLst>> } | any) => void
}
