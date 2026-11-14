/**
 * 20.arithmetic.unit - Arithmetic Unit Event Bus Buzz Router
 * Integrates arithmetic reduction into the engine event dispatch pipeline.
 * Pure deterministic PRNG kernel: FNV-1a + Mulberry32, zero Math.random.
 */

import type { ArithmeticModel } from '../arithmetic.model.js'
import type { ArithmeticActionBit } from '../fce/arithmetic.bit.js'
import { reduceArithmetic } from '../arithmetic.reduce.js'

export function arithmeticBuzz(
    model: ArithmeticModel,
    bit: ArithmeticActionBit,
): ArithmeticModel {
    const nextModel = reduceArithmetic(model, bit)
    return Object.freeze(nextModel)
}

export const fnv1a32 = (input: string): number => {
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
}

export const mulberry32Step = (
    seed: number,
): { value: number; nextSeed: number } => {
    let t = (seed + 0x6d2b79f5) >>> 0
    const nextSeed = t
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return { value: (t ^ (t >>> 14)) >>> 0, nextSeed }
}

export const deriveDeterministicUint32 = (
    masterSeed: string,
    tick: number,
    salt: string,
): number => {
    const safeTick = Number.isInteger(tick) && tick >= 0 ? tick : 0
    const digest = fnv1a32(`${masterSeed}:${safeTick}:${salt}`)
    return mulberry32Step(digest).value >>> 0
}

export const deriveDeterministicSeedInt = deriveDeterministicUint32

export const nextDeterministicRoll = (
    masterSeed: string,
    tick: number,
    salt: string,
    sides: number,
): number => {
    const safeSides = Number.isInteger(sides) && sides > 0 ? sides : 6
    return (deriveDeterministicUint32(masterSeed, tick, salt) % safeSides) + 1
}

export const rollDeterministic2d6 = (
    masterSeed: string,
    tick: number,
    salt: string,
): { dieA: number; dieB: number; total: number } => {
    const dieA = nextDeterministicRoll(masterSeed, tick, `${salt}:A`, 6)
    const dieB = nextDeterministicRoll(masterSeed, tick, `${salt}:B`, 6)
    return { dieA, dieB, total: dieA + dieB }
}

export const pickDeterministicIndex = (
    masterSeed: string,
    tick: number,
    salt: string,
    length: number,
): number => {
    if (!Number.isInteger(length) || length <= 0) {
        throw new RangeError(
            `[INVALID_PICK_LENGTH] pickDeterministicIndex length must be positive integer: ${String(length)}`,
        )
    }
    return deriveDeterministicUint32(masterSeed, tick, salt) % length
}

export const computeHorizonProgressBps = (
    tick: number,
    totalTicks: number,
): number => {
    if (
        !Number.isInteger(tick) ||
        !Number.isInteger(totalTicks) ||
        totalTicks <= 0 ||
        tick < 0
    ) {
        throw new RangeError(
            '[INVALID_HORIZON_PROGRESS] tick and positive totalTicks must be integers',
        )
    }
    const clampedTick = Math.min(tick, totalTicks)
    return Number((BigInt(clampedTick) * 10000n) / BigInt(totalTicks))
}

export const computeSolarDayProgressBps = (
    hourOrElapsed: number,
    minuteOrDuration = 86400,
    second = 0,
    elapsedSolarStartSeconds?: number,
): number => {
    const DAY_SECONDS = 86400
    if (elapsedSolarStartSeconds !== undefined) {
        const hour = hourOrElapsed
        const minute = minuteOrDuration
        if (
            !Number.isInteger(hour) ||
            !Number.isInteger(minute) ||
            !Number.isInteger(second) ||
            !Number.isInteger(elapsedSolarStartSeconds) ||
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59 ||
            second < 0 ||
            second > 59 ||
            elapsedSolarStartSeconds < 0
        ) {
            throw new RangeError(
                '[INVALID_SOLAR_SECONDS] hour/minute/second and elapsedSolarStartSeconds must be valid integers',
            )
        }
        const clockSeconds = hour * 3600 + minute * 60 + second
        const wrapped = (clockSeconds + elapsedSolarStartSeconds) % DAY_SECONDS
        return Number((BigInt(wrapped) * 10000n) / BigInt(DAY_SECONDS))
    }
    if (minuteOrDuration === 86400 && second === 0) {
        const elapsedSeconds = hourOrElapsed
        const dayDurationSeconds = minuteOrDuration
        if (
            !Number.isInteger(elapsedSeconds) ||
            elapsedSeconds < 0 ||
            !Number.isInteger(dayDurationSeconds) ||
            dayDurationSeconds <= 0
        ) {
            throw new RangeError(
                '[INVALID_SOLAR_SECONDS] elapsedSeconds must be non-negative integer',
            )
        }
        const wrapped = elapsedSeconds % dayDurationSeconds
        return Number((BigInt(wrapped) * 10000n) / BigInt(dayDurationSeconds))
    }
    const hour = hourOrElapsed
    const minute = minuteOrDuration
    if (
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        !Number.isInteger(second) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59
    ) {
        throw new RangeError(
            '[INVALID_SOLAR_SECONDS] hour/minute/second must be valid clock integers',
        )
    }
    const clockSeconds = hour * 3600 + minute * 60 + second
    const wrapped = clockSeconds % DAY_SECONDS
    return Number((BigInt(wrapped) * 10000n) / BigInt(DAY_SECONDS))
}

export type PacingActStageLocal = 'ACT_I' | 'ACT_II' | 'ACT_III'

export const resolveThreeActStage = (
    progressBps: number,
    actIEndBps: number,
    actIIEndBps: number,
): PacingActStageLocal => {
    if (
        !Number.isInteger(progressBps) ||
        !Number.isInteger(actIEndBps) ||
        !Number.isInteger(actIIEndBps)
    ) {
        throw new TypeError(
            '[INVALID_ACT_BOUNDS] progress and act bounds must be integers',
        )
    }
    if (
        actIEndBps < 0 ||
        actIEndBps > 10000 ||
        actIIEndBps < 0 ||
        actIIEndBps > 10000
    ) {
        throw new RangeError(
            '[INVALID_ACT_BOUNDS] act bounds must sit inside [0, 10000]',
        )
    }
    if (actIEndBps >= actIIEndBps) {
        throw new RangeError(
            '[INVALID_ACT_BOUNDS] actIEndBps must be strictly below actIIEndBps',
        )
    }
    const clamped = Math.min(10000, Math.max(0, progressBps))
    if (clamped < actIEndBps) return 'ACT_I'
    if (clamped < actIIEndBps) return 'ACT_II'
    return 'ACT_III'
}

export const computeCombinedPacingMultiplierBps = (
    actMultBps: number,
    diurnalMultBps: number,
): number => {
    if (!Number.isInteger(actMultBps) || !Number.isInteger(diurnalMultBps)) {
        throw new TypeError(
            '[INVALID_PACING_MULTIPLIER] multipliers must be integers',
        )
    }
    if (actMultBps < 0 || diurnalMultBps < 0) {
        throw new RangeError(
            '[INVALID_PACING_MULTIPLIER] multipliers must be non-negative',
        )
    }
    return Number((BigInt(actMultBps) * BigInt(diurnalMultBps)) / 10000n)
}
