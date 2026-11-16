import { describe, it, expect, vi } from 'vitest'
import { EngineModel } from './engine.model.js'
import {
    resetEngine,
    ENGINE_COMPANION_RESET_ACTIONS,
} from './buz/engine.buzz.js'
import { RESET_ENGINE } from './engine.action.js'
import { reducer } from './engine.reduce.js'

describe('Task 3.1: Reset Core Engine Boot Posture', () => {
    it('restores EngineModel from READY runtime state back to OFFLINE Void State', async () => {
        const model = new EngineModel()
        model.status = 'READY'
        model.booted = true
        model.seriesSlug = 'gotham-trinity-crisis'
        model.activeSeriesSlug = 'gotham-trinity-crisis'
        model.headSequence = 42
        model.lastBootMs = 1763218000000
        model.lastStateHash = 'a'.repeat(64)
        model.lastAuditReceipt = {
            immutabilityBlocked: true,
            handCapacityBlocked: true,
            antiReflexivityBlocked: true,
            auditPassed: true,
            auditHash: 'b'.repeat(64),
            timestampMs: 1763218000000,
        }

        const huntedActions: string[] = []
        const mockState = {
            hunt: vi.fn(async (actionType: string) => {
                huntedActions.push(actionType)
                return {}
            }),
        } as any

        let resolvedBit: any = null
        const updated = await reducer(
            model,
            {
                type: RESET_ENGINE,
                bale: {
                    idx: 'reset-engine',
                    slv: (res: any) => {
                        resolvedBit = res
                    },
                },
            } as any,
            mockState,
        )

        expect(updated.status).toBe('OFFLINE')
        expect(updated.booted).toBe(false)
        expect(updated.seriesSlug).toBe('')
        expect(updated.activeSeriesSlug).toBeUndefined()
        expect(updated.headSequence).toBe(0)
        expect(updated.lastBootMs).toBe(0)
        expect(updated.lastStateHash).toBe('0'.repeat(64))
        expect(updated.lastAuditReceipt).toBeUndefined()
        expect(updated.lastStatusReport).toBeUndefined()
        expect(updated.activeChronology).toBeDefined()

        expect(resolvedBit?.status).toBe('OFFLINE')
        expect(resolvedBit?.engBit?.idx).toBe('reset-engine-pass')
        expect(resolvedBit?.engBit?.val).toBe(1)
        expect(resolvedBit?.engBit?.dat?.fanOutExecuted).toBe(true)

        for (const expectedAction of ENGINE_COMPANION_RESET_ACTIONS) {
            expect(huntedActions).toContain(expectedAction)
        }
        expect(huntedActions).toContain('[Console action] Update Console')
    })

    it('degrades gracefully when invoked headless without bale or State dispatcher', async () => {
        const model = new EngineModel()
        model.status = 'READY'
        model.booted = true
        model.seriesSlug = 'gotham-trinity-crisis'

        const updated = await resetEngine(model)
        expect(updated.status).toBe('OFFLINE')
        expect(updated.booted).toBe(false)
        expect(updated.seriesSlug).toBe('')
        expect(updated.lastStateHash).toBe('0'.repeat(64))
    })
})
