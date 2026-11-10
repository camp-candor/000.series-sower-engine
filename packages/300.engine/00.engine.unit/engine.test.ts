import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EngineModel } from './engine.model.js'
import {
    initEngine,
    bootEngine,
    statusEngine,
    auditEngine,
    resetEngine,
} from './buz/engine.buzz.js'
import { BOOT_ENGINE } from './engine.action.js'
import { reducer } from './engine.reduce.js'

describe('00.engine.unit - Engine Master Lifecycle Orchestrator Battery', () => {
    let model: EngineModel
    let mockState: any
    let dispatchedActions: string[]

    beforeEach(async () => {
        model = new EngineModel()
        dispatchedActions = []
        mockState = {
            hunt: vi.fn(async (actionType: string) => {
                dispatchedActions.push(actionType)
                if (actionType.includes('Hydrate State')) {
                    return { stateHash: 'a'.repeat(64) }
                }
                if (actionType.includes('Query Database')) {
                    return {
                        databaseBit: {
                            dat: { records: [{ id: 1 }, { id: 2 }] },
                        },
                    }
                }
                return {}
            }),
        }
        await initEngine(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('initializes engine and sets status to READY', () => {
        expect(model.status).toBe('READY')
        expect(model.booted).toBe(false)
    })

    it('orchestrates 3-phase boot sequence and updates status to READY', async () => {
        const slv = vi.fn()
        await bootEngine(
            model,
            {
                idx: 'boot-test',
                dat: {
                    bootParams: {
                        seriesSlug: 'test-series',
                        seedGenesis: true,
                        bibleState: {},

                        timestampMs: 1000,
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        expect(model.status).toBe('READY')
        expect(model.booted).toBe(true)
        expect(model.lastStateHash).toBe('a'.repeat(64))
        expect(model.lastBootMs).toBe(1000)

        // Verify the 3-phase boot dispatches occurred
        expect(
            dispatchedActions.some((a) => a.includes('Mount Realm Database')),
        ).toBe(true)
        expect(
            dispatchedActions.some((a) => a.includes('Seed Primordial')),
        ).toBe(true)
        expect(dispatchedActions.some((a) => a.includes('Hydrate State'))).toBe(
            true,
        )
    })

    it('aggregates table inventory and compiles status report', async () => {
        const slv = vi.fn()
        await statusEngine(model, { idx: 'status-test', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        const report = slv.mock.calls[0][0].report
        expect(report).toBeDefined()
        expect(report.status).toBe('READY')
        expect(report.tables).toHaveLength(6)
        expect(report.totalRows).toBe(12) // 6 tables * 2 mock rows
    })

    it('executes invariant audit and compiles cryptographic audit receipt', async () => {
        const slv = vi.fn()
        await auditEngine(model, { idx: 'audit-test', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        const receipt = slv.mock.calls[0][0].receipt
        expect(receipt.auditPassed).toBe(true)
        expect(receipt.immutabilityBlocked).toBe(true)
        expect(receipt.handCapacityBlocked).toBe(true)
        expect(receipt.antiReflexivityBlocked).toBe(true)
        expect(receipt.auditHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('resets engine state to OFFLINE', async () => {
        model.status = 'READY'
        model.booted = true
        model.lastBootMs = 5000

        const slv = vi.fn()
        await resetEngine(model, { idx: 'reset-test', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        expect(model.status).toBe('OFFLINE')
        expect(model.booted).toBe(false)
        expect(model.lastBootMs).toBe(0)
    })

    it('routes BOOT_ENGINE cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: BOOT_ENGINE,
                bale: {
                    idx: 'reducer-boot',
                    dat: { bootParams: { seriesSlug: 'reducer-test' } },
                    slv,
                } as any,
            },
            mockState,
        )) as EngineModel

        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalled()
    })
})
