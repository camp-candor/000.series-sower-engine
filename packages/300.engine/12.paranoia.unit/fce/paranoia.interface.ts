/**
 * 12.paranoia.unit - Paranoia & Pressure Clock Interface Contracts
 * Fixed-point basis-point arithmetic, thermodynamic dissipation flow, and tripwire cascades.
 */

export type ClockDispatchType =
    | 'CONFRONTATION'
    | 'PANIC_FLIGHT'
    | 'DEFENSIVE_RETREAT'
    | 'SUSPICION_ACCUSATION'
    | 'TERRITORIAL_SURGE'

export type TripwirePhase =
    | 'CALM'
    | 'FIDGET'
    | 'HYPERVIGILANT'
    | 'CRITICAL_OVERDRIVE'

export interface ParanoiaClockState {
    readonly clockId: string
    readonly entityId: string
    readonly clockName: string
    readonly valueBps: number // [0, 10000]
    readonly thresholdBps: number // [0, 10000]
    readonly decayRateBps: number // [0, 10000]
    readonly segmentsCount: number // Default 6 segments
    readonly currentSegment: number // [0, segmentsCount]
    readonly tripwirePhase: TripwirePhase
    readonly visionConeDegrees: number // 360 (normal) -> 60 (hypervigilant)
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

export interface ThermodynamicImpulseParams {
    readonly clockId: string
    readonly impulseBps: number
    readonly tick: number
    readonly timestampMs: number
    readonly sourceLocus?: string
    readonly impulseType?: string
}

export interface ThermodynamicFlowReceipt {
    readonly clockId: string
    readonly entityId: string
    readonly prevValueBps: number
    readonly nextValueBps: number
    readonly dissipatedBps: number
    readonly tripwirePhase: TripwirePhase
    readonly isOverdrive: boolean
    readonly timestampMs: number
}

export interface ThermodynamicAuditReport {
    readonly valid: boolean
    readonly totalClocks: number
    readonly totalSystemHeatBps: number
    readonly averageStrainBps: number
    readonly criticalOverdriveCount: number
    readonly hypervigilantCount: number
    readonly timestampMs: number
}

export interface ClockDispatchTrigger {
    readonly clockId: string
    readonly entityId: string
    readonly dispatchType: ClockDispatchType
    readonly dischargeBps: number
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
