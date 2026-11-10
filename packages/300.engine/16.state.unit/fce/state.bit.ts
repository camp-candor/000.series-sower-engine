/**
 * 16.state.unit - State Bit Payload Contracts
 */
import type {
    LedgerWorkingState,
    StateFoldReceipt,
    WhyDirtyResult,
    HydrateStateParams,
    FoldEventsParams,
    WhyDirtyParams,
} from './state.interface.js'

export interface StatePayload {
    readonly seriesSlug?: string
    readonly expectedHash?: string
    readonly tick?: number
    readonly workingState?: LedgerWorkingState
    readonly stateHash?: string
    readonly verifiedParity?: boolean
    readonly hydrateParams?: HydrateStateParams
    readonly foldParams?: FoldEventsParams
    readonly whyDirtyParams?: WhyDirtyParams
    readonly snapshot?: LedgerWorkingState
    readonly foldReceipt?: StateFoldReceipt
    readonly whyDirtyResult?: WhyDirtyResult
    readonly rowCount?: number
    readonly timestampMs?: number
    readonly error?: string
    [key: string]: any
}

export default interface StateBit {
    idx: string
    src?: string
    val?: number
    dat?: StatePayload
    lst?: readonly LedgerWorkingState[]
    slv?: Function
}
