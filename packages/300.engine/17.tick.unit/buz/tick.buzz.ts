import { createHmac } from 'node:crypto'
import type { TickModel } from '../tick.model'
import type TickBit from '../fce/tick.bit'
import type State from '../../99.core/state'
import type {
    TickAdvancedEventPayload,
    DecaySweepReport,
} from '../fce/tick.interface'
import type { ILocalDatabasePort } from '../../02.database.unit/fce/database.interface'

/**
 * Routes telemetry to the cns00 console via the global LIBRARY bus only.
 * The engine bus (ste.hunt) has no console reducer, so a hunt on it never
 * resolves and would freeze the TUI menu loop.
 */
export const emitConsole = async (
    _ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Non-blocking degradation
        }
    }
}

/**
 * Derives deterministic PRNG seed for a specific tick using HMAC-SHA256.
 * Zero unseeded Math.random() calls allowed.
 */
export function deriveTickSeed(
    worldSeed: string,
    tickNumber: number,
    subsystemId = 'simulation',
): string {
    return createHmac('sha256', worldSeed)
        .update(`${subsystemId}:${tickNumber}`, 'utf8')
        .digest('hex')
}

export const initTick = async (
    cpy: TickModel,
    bal: TickBit,
    ste: State,
): Promise<TickModel> => {
    const initialTick = typeof bal?.val === 'number' ? bal.val : 0
    const worldSeed =
        bal?.src || cpy.worldSeed || 'series_world_seed_genesis_alpha'

    cpy.currentTick = initialTick
    cpy.worldSeed = worldSeed
    cpy.lastDerivedSeed = deriveTickSeed(worldSeed, initialTick)
    cpy.totalTicksAdvanced = 0
    cpy.lastTickAtMs = (bal?.dat as any)?.timestampMs || 0

    await emitConsole(
        ste,
        `>> [TICK:INIT] [OK] Logical clock initialized at Tick #${initialTick} (Seed: ${cpy.lastDerivedSeed.slice(0, 8)}...)`,
    )

    if (bal?.slv) {
        bal.slv({
            tckBit: { idx: 'init-tick', val: initialTick, src: worldSeed },
            currentTick: initialTick,
            derivedSeed: cpy.lastDerivedSeed,
        })
    }
    return cpy
}

export const updateTick = async (
    cpy: TickModel,
    bal: TickBit,
    _ste: State,
): Promise<TickModel> => {
    if (bal?.slv) {
        bal.slv({
            tckBit: { idx: 'update-tick', val: cpy.currentTick },
            currentTick: cpy.currentTick,
            derivedSeed: cpy.lastDerivedSeed,
        })
    }
    return cpy
}

export const deriveSeedTickAction = (
    cpy: TickModel,
    bal: TickBit,
    _ste: State,
): TickModel => {
    const tickNumber = typeof bal?.val === 'number' ? bal.val : cpy.currentTick
    const subsystem = bal?.src || 'simulation'
    const derived = deriveTickSeed(cpy.worldSeed, tickNumber, subsystem)

    cpy.lastDerivedSeed = derived

    if (bal?.slv) {
        bal.slv({
            tckBit: { idx: 'derive-seed-tick', src: derived, val: tickNumber },
            derivedSeed: derived,
        })
    }
    return cpy
}

export const executeDecaySweep = (
    dbPort: ILocalDatabasePort,
    deltaTicks: number,
    timestampMs: number,
): DecaySweepReport => {
    // 1. Decay Paranoia Clocks: value_bps = MAX(0, value_bps - decay_rate_bps * deltaTicks)
    const clockStmt = dbPort.prepare(`
    UPDATE paranoia_clocks
    SET value_bps = MAX(0, value_bps - (decay_rate_bps * ?)),
        is_triggered = CASE WHEN MAX(0, value_bps - (decay_rate_bps * ?)) >= threshold_bps THEN 1 ELSE 0 END,
        updated_at_ms = ?
    WHERE decay_rate_bps > 0 AND value_bps > 0;
  `)
    const clockRes = clockStmt.run(deltaTicks, deltaTicks, timestampMs)

    // 2. Decrement Grievance Cooldowns: cooldown_cycles = MAX(0, cooldown_cycles - deltaTicks)
    const grievanceStmt = dbPort.prepare(`
    UPDATE grievance_status
    SET cooldown_cycles = MAX(0, cooldown_cycles - ?),
        updated_at_ms = ?
    WHERE cooldown_cycles > 0;
  `)
    const grievanceRes = grievanceStmt.run(deltaTicks, timestampMs)

    return {
        clocksUpdated: clockRes.changes || 0,
        grievancesUpdated: grievanceRes.changes || 0,
        elapsedTicks: deltaTicks,
        timestampMs,
    }
}

export const advanceTickAction = async (
    cpy: TickModel,
    bal: TickBit,
    ste: State,
): Promise<TickModel> => {
    const dbPort: ILocalDatabasePort | undefined =
        (bal?.dat as any)?.dbPort || ste?.value?.database?.port
    const targetStep = typeof bal?.val === 'number' && bal.val > 0 ? bal.val : 1
    const explicitTimestampMs =
        (bal?.dat as any)?.timestampMs || cpy.lastTickAtMs + targetStep * 60000

    const previousTick = cpy.currentTick
    const newTick = previousTick + targetStep
    const derivedTickSeed = deriveTickSeed(cpy.worldSeed, newTick)

    cpy.currentTick = newTick
    cpy.lastDerivedSeed = derivedTickSeed
    cpy.totalTicksAdvanced += targetStep
    cpy.lastTickAtMs = explicitTimestampMs

    let decayReport: DecaySweepReport | undefined

    // Execute database-level decay if database port is supplied
    if (dbPort && dbPort.isOpen()) {
        try {
            const tx = dbPort.transaction(() =>
                executeDecaySweep(dbPort, targetStep, explicitTimestampMs),
            )
            decayReport = tx()
        } catch (decayErr: any) {
            await emitConsole(ste, `:: [TICK:DECAY_FAIL] ${decayErr.message}`)
        }
    }

    const advancePayload: TickAdvancedEventPayload = {
        previousTick,
        newTick,
        deltaTicks: targetStep,
        worldSeed: cpy.worldSeed,
        derivedTickSeed,
        occurredAtMs: explicitTimestampMs,
    }

    await emitConsole(
        ste,
        `>> [TICK:ADVANCED] [OK] Tick ${previousTick} -> ${newTick} (+${targetStep}). Seed: ${derivedTickSeed.slice(0, 8)}...`,
    )

    if (decayReport) {
        await emitConsole(
            ste,
            `>> [TICK:DECAY_SWEEP] [OK] Decayed ${decayReport.clocksUpdated} clocks, updated ${decayReport.grievancesUpdated} grievances.`,
        )
    }

    if (bal?.slv) {
        bal.slv({
            tckBit: { idx: 'advance-tick', val: newTick, src: derivedTickSeed },
            currentTick: newTick,
            derivedSeed: derivedTickSeed,
            advancePayload,
            decayReport,
        })
    }
    return cpy
}

export const executeDecaySweepTickAction = async (
    cpy: TickModel,
    bal: TickBit,
    ste: State,
): Promise<TickModel> => {
    const dbPort: ILocalDatabasePort =
        (bal?.dat as any)?.dbPort || ste?.value?.database?.port
    const deltaTicks = typeof bal?.val === 'number' && bal.val > 0 ? bal.val : 1
    const timestampMs =
        (bal?.dat as any)?.timestampMs || cpy.lastTickAtMs || 1700000000000

    if (!dbPort || !dbPort.isOpen()) {
        if (bal?.slv) bal.slv({ err: '[DATABASE_ERROR] dbPort closed' })
        return cpy
    }

    try {
        const report = executeDecaySweep(dbPort, deltaTicks, timestampMs)
        await emitConsole(
            ste,
            `>> [TICK:DECAY_SWEEP] [OK] Decayed ${report.clocksUpdated} clocks, updated ${report.grievancesUpdated} grievances.`,
        )
        if (bal?.slv) {
            bal.slv({
                tckBit: {
                    idx: 'execute-decay-sweep-tick',
                    val: report.clocksUpdated,
                },
                decayReport: report,
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const resetTick = (
    cpy: TickModel,
    bal: TickBit,
    _ste: State,
): TickModel => {
    cpy.currentTick = 0
    cpy.totalTicksAdvanced = 0
    cpy.lastDerivedSeed = deriveTickSeed(cpy.worldSeed, 0)

    if (bal?.slv) {
        bal.slv({ tckBit: { idx: 'reset-tick', val: 0 }, currentTick: 0 })
    }
    return cpy
}
