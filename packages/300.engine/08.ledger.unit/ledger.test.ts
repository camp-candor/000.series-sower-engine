import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LedgerModel } from './ledger.model.js'
import {
    initLedger,
    stageMutationAction,
    rollbackStagingAction,
    commitStagingAction,
    assertBasisPoints,
} from './buz/ledger.buzz.js'
import { COMMIT_STAGING_LEDGER } from './ledger.action.js'
import { reducer } from './ledger.reduce.js'

describe('08.ledger.unit - Volatile Staging Accumulation Battery', () => {
    let model: LedgerModel
    let mockState: any
    let dbOperations: any[]
    let eventAppends: any[]

    beforeEach(async () => {
        model = new LedgerModel()
        dbOperations = []
        eventAppends = []
        mockState = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Exec Batch Database')) {
                    dbOperations.push(...payload.dat.operations)
                    return { databaseBit: { val: 1 } }
                }
                if (actionType.includes('Append Event')) {
                    eventAppends.push(payload.dat.appendParams)
                    return { eventBit: { val: 1 } }
                }
                return {}
            }),
        }
        await initLedger(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('stages multiple mutations into ephemeral RAM scratchpad', async () => {
        const slv = vi.fn()
        await stageMutationAction(
            model,
            {
                idx: 'stage-1',
                dat: {
                    stageParams: {
                        mutationType: 'SOMATIC_TRAUMA',
                        entityId: 'char_wart',
                        payload: { fatigueBps: 2500, painBps: 1200 },
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        expect(model.stagedMutations).toHaveLength(1)
        expect(model.sequenceCursor).toBe(1)
        expect(model.stagedMutations[0].mutationType).toBe('SOMATIC_TRAUMA')
        // Verified zero SQLite writes occurred during staging
        expect(dbOperations).toHaveLength(0)
    })

    it('rejects anti-reflexive leverage mutations during staging with ANTI_REFLEXIVITY_BREACH', async () => {
        const slv = vi.fn()
        await stageMutationAction(
            model,
            {
                idx: 'stage-self-debt',
                dat: {
                    stageParams: {
                        mutationType: 'STRING_EXCHANGE',
                        entityId: 'char_bog',
                        targetId: 'char_bog', // Self-referential!
                        payload: { holderId: 'char_bog', debtorId: 'char_bog', stringsCount: 1 },
                    },
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                ledgerBit: expect.objectContaining({
                    val: -1,
                    idx: 'stage-mutation-breach',
                    src: expect.stringContaining('ANTI_REFLEXIVITY_BREACH'),
                }),
            }),
        )
        expect(model.stagedMutations).toHaveLength(0)
    })

    it('discards all staged mutations cleanly during rollback without side effects', async () => {
        await stageMutationAction(
            model,
            {
                idx: 'stg',
                dat: {
                    stageParams: {
                        mutationType: 'SPATIAL_MOVE',
                        entityId: 'char_bog',
                        payload: { locationId: 'loc_the_warm_pipe' },
                    },
                },
            },
            mockState,
        )

        expect(model.stagedMutations).toHaveLength(1)

        const slv = vi.fn()
        await rollbackStagingAction(model, { idx: 'rb', slv }, mockState)

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                ledgerBit: expect.objectContaining({ val: 1, idx: 'rollback-staging-pass' }),
            }),
        )
        expect(model.stagedMutations).toHaveLength(0)
        expect(dbOperations).toHaveLength(0)
    })

    it('atomically flushes and commits staged mutations into database and event log', async () => {
        // Stage 2 valid mutations
        await stageMutationAction(
            model,
            {
                idx: 'stg1',
                dat: {
                    stageParams: {
                        mutationType: 'STRING_EXCHANGE',
                        entityId: 'char_bog',
                        targetId: 'char_wart',
                        payload: { holderId: 'char_bog', debtorId: 'char_wart', stringsCount: 2, weightBps: 3000 },
                    },
                },
            },
            mockState,
        )

        await stageMutationAction(
            model,
            {
                idx: 'stg2',
                dat: {
                    stageParams: {
                        mutationType: 'SPATIAL_MOVE',
                        entityId: 'char_bog',
                        payload: { locationId: 'loc_culvert_junction', toCoord: { q: 1, r: 0 } },
                    },
                },
            },
            mockState,
        )

        expect(model.stagedMutations).toHaveLength(2)

        const slv = vi.fn()
        await commitStagingAction(model, { idx: 'commit', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        const result = slv.mock.calls[0][0].commitResult
        expect(result.success).toBe(true)
        expect(result.eventsApplied).toBe(2)
        expect(model.stagedMutations).toHaveLength(0)

        // Verifies database and event batches executed atomically
        expect(dbOperations).toHaveLength(2)
        expect(eventAppends).toHaveLength(2)
    })

    it('rejects floating-point basis points with FLOAT_PROHIBITED', () => {
        expect(() => assertBasisPoints(1500.5, 'fatigueBps')).toThrow(/FLOAT_PROHIBITED/)
    })

    it('routes COMMIT_STAGING_LEDGER cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: COMMIT_STAGING_LEDGER,
                bale: { idx: 'reducer-commit', slv } as any,
            },
            mockState,
        )) as LedgerModel

        expect(result).toBeInstanceOf(LedgerModel)
        expect(slv).toHaveBeenCalled()
    })
})
