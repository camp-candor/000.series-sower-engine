export interface TickAdvancedEventPayload {
    previousTick: number
    newTick: number
    deltaTicks: number
    worldSeed: string
    derivedTickSeed: string
    occurredAtMs: number
}

export interface DecaySweepReport {
    clocksUpdated: number
    grievancesUpdated: number
    elapsedTicks: number
    timestampMs: number
}

export default interface Tick {
    idx: string
    currentTick: number
    worldSeed: string
    lastDerivedSeed: string
    totalTicksAdvanced: number
    lastTickAtMs: number
}
