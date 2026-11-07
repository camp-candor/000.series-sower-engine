/**
 * 12.paranoia.unit - Paranoia & Pressure Clock Interface Contracts
 * Fixed-point basis-point arithmetic, threshold gating, and dramatic dispatch triggers.
 */

export type ClockDispatchType =
    | 'CONFRONTATION'
    | 'PANIC_FLIGHT'
    | 'DEFENSIVE_RETREAT'
    | 'SUSPICION_ACCUSATION'
    | 'TERRITORIAL_SURGE'

export interface ParanoiaClockState {
    readonly clockId: string
    readonly entityId: string
    readonly clockName: string
    readonly valueBps: number // [0, 10000]
    readonly thresholdBps: number // [0, 10000]
    readonly decayRateBps: number // [0, 10000]
    readonly isTriggered: boolean
    readonly lastTickedAtMs: number
    readonly lastDispatchedAtMs?: number
}

export interface ClockTickParams {
    readonly clockId: string
    readonly deltaBps: number
    readonly tick: number
    readonly timestampMs: number
    readonly reason?: string
}

export interface ClockDispatchTrigger {
    readonly clockId: string
    readonly entityId: string
    readonly dispatchType: ClockDispatchType
    readonly dischargeBps: number // Amount of pressure to deduct post-dispatch
    readonly tick: number
    readonly timestampMs: number
    readonly narrativeContext: string
}

export interface ClockDispatchResult {
    readonly dispatched: boolean
    readonly clockId: string
    readonly entityId: string
    readonly dispatchType: ClockDispatchType
    readonly preDispatchValueBps: number
    readonly postDispatchValueBps: number
    readonly isTriggered: boolean
    readonly eventId?: string
    readonly timestampMs: number
}

export default interface Paranoia {
    idx: string
    clocks: Map<string, ParanoiaClockState>
    activeDispatchCount: number
    lastDispatchedClockId: string
}
