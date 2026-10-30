import { expect } from 'vitest'

interface CustomMatchers<R = unknown> {
    toExecuteWithinBudget(maxDurationMs: number): R
}

declare module 'vitest' {
    interface Assertion<T = any> extends CustomMatchers<T> {}
    interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
    toExecuteWithinBudget(callback: () => void, maxDurationMs: number) {
        const budgetNs = BigInt(Math.floor(maxDurationMs * 1_000_000))

        // Warm-up execution to prime the V8 JIT and eliminate cold-start cache anomalies
        callback()

        const start = process.hrtime.bigint()
        callback()
        const end = process.hrtime.bigint()

        const elapsedNs = end - start
        const elapsedMs = Number(elapsedNs) / 1_000_000
        const pass = elapsedNs <= budgetNs

        return {
            pass,
            message: () =>
                pass
                    ? `[BUDGET_PASS] Execution took ${elapsedMs.toFixed(4)}ms (Budget: <= ${maxDurationMs.toFixed(4)}ms)`
                    : `[BUDGET_BREACH] Invariant step exceeded execution ceiling! Took ${elapsedMs.toFixed(4)}ms, strictly capped at ${maxDurationMs.toFixed(4)}ms`,
        }
    },
})
