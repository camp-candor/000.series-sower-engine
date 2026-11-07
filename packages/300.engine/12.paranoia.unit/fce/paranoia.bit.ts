/**
 * 12.paranoia.unit - Paranoia Bit Payload Contracts
 */
import type {
    ParanoiaClockState,
    ClockTickParams,
    ClockDispatchTrigger,
    ClockDispatchResult,
} from './paranoia.interface.js'

export interface ParanoiaPayload {
    readonly clock?: ParanoiaClockState
    readonly clocks?: readonly ParanoiaClockState[]
    readonly tickParams?: ClockTickParams
    readonly dispatchTrigger?: ClockDispatchTrigger
    readonly dispatchResult?: ClockDispatchResult
    readonly clockId?: string
    readonly entityId?: string
    readonly isTriggered?: boolean
    readonly rowCount?: number
    readonly error?: string
}

export default interface ParanoiaBit {
    idx: string
    src?: string
    val?: number
    dat?: ParanoiaPayload
    slv?: Function
}
