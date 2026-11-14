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
