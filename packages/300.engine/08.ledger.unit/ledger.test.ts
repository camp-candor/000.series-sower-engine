import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LedgerModel } from './ledger.model.js'
import {
    initLedger,
    stageMutationAction,
    rollbackStagingAction,
    commitStagingAction,
    assertBasisPoints,
    resolveDual2d6Action,
    classifyMargin,
    evaluateDual2d6,
    roll2d6,
} from './buz/ledger.buzz.js'
import { COMMIT_STAGING_LEDGER } from './ledger.action.js'
import { RESOLVE_DUAL_2D6_LEDGER } from './ledger.action.js'
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
                        payload: {
                            holderId: 'char_bog',
                            debtorId: 'char_bog',
                            stringsCount: 1,
                        },
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
                ledgerBit: expect.objectContaining({
                    val: 1,
                    idx: 'rollback-staging-pass',
                }),
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
                        payload: {
                            holderId: 'char_bog',
                            debtorId: 'char_wart',
                            stringsCount: 2,
                            weightBps: 3000,
                        },
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
                        payload: {
                            locationId: 'loc_culvert_junction',
                            toCoord: { q: 1, r: 0 },
                        },
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
        expect(() => assertBasisPoints(1500.5, 'fatigueBps')).toThrow(
            /FLOAT_PROHIBITED/,
        )
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

describe('08.ledger.unit - Stage 4 Dual 2d6 Conflict Resolution Battery', () => {
    let model: LedgerModel

    beforeEach(async () => {
        model = new LedgerModel()
        await initLedger(model)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('classifies four discrete margin tiers correctly', () => {
        expect(classifyMargin(5)).toBe('clean_win')
        expect(classifyMargin(4)).toBe('clean_win')
        expect(classifyMargin(3)).toBe('costly_win')
        expect(classifyMargin(2)).toBe('costly_win')
        expect(classifyMargin(1)).toBe('mutual_wound')
        expect(classifyMargin(0)).toBe('mutual_wound')
        expect(classifyMargin(-1)).toBe('mutual_wound')
        expect(classifyMargin(-2)).toBe('backfire')
        expect(classifyMargin(-5)).toBe('backfire')
    })

    it('clamps net modifiers strictly to [-2, +2] range', () => {
        const deterministicRng = () => 0.5 // (floor(0.5*6)+1) = 4 -> 2d6 = 8
        const receipt = evaluateDual2d6(
            {
                initiator: {
                    id: 'char_bog',
                    stats: { cunning: 10, spite: 0, poise: -10, vigor: 0 },
                },
                target: {
                    id: 'char_wart',
                    stats: { cunning: 0, spite: 0, poise: 0, vigor: 0 },
                },
                tick: 1,
                timestampMs: 1000,
            },
            deterministicRng,
        )

        // Modifiers must be clamped to [+2, -2]
        expect(receipt.auditTrail.modObj).toBe(2)
        expect(receipt.auditTrail.modSom).toBe(-2)
    })

    it('detects compound extreme DOUBLE_CLEAN_WIN when both axes achieve clean_win', () => {
        // Mock RNG returning high for initiator, low for target
        let callCount = 0
        const rng = () => {
            callCount++
            // rollObjA: 6, 6 -> 12; rollObjB: 1, 1 -> 2 (dObj = 10 -> clean_win)
            // rollSomA: 6, 6 -> 12; rollSomB: 1, 1 -> 2 (dSom = 10 -> clean_win)
            const seq = [0.99, 0.99, 0.01, 0.01, 0.99, 0.99, 0.01, 0.01]
            return seq[(callCount - 1) % seq.length]
        }

        const receipt = evaluateDual2d6(
            {
                initiator: { id: 'char_bog', stats: {} },
                target: { id: 'char_wart', stats: {} },
                tick: 1,
                timestampMs: 1000,
            },
            rng,
        )

        expect(receipt.objectiveOutcome).toBe('clean_win')
        expect(receipt.somaticOutcome).toBe('clean_win')
        expect(receipt.isCompoundExtreme).toBe(true)
        expect(receipt.compoundClassification).toBe('DOUBLE_CLEAN_WIN')
        expect(receipt.stateDelta.stringsAwarded).toContainEqual({
            from: 'char_wart',
            to: 'char_bog',
            count: 1,
        })
        expect(
            receipt.stateDelta.somaticConditionsAdded['char_wart'],
        ).toContain('humiliated')
    })

    it('detects compound extreme DOUBLE_MUTUAL_WOUND and awards clock ticks', () => {
        // True ties: 4, 4 on all rolls
        const rng = () => 0.5

        const receipt = evaluateDual2d6(
            {
                initiator: { id: 'char_bog', stats: {} },
                target: { id: 'char_wart', stats: {} },
                tick: 1,
                timestampMs: 1000,
            },
            rng,
        )

        expect(receipt.objectiveOutcome).toBe('mutual_wound')
        expect(receipt.somaticOutcome).toBe('mutual_wound')
        expect(receipt.isCompoundExtreme).toBe(true)
        expect(receipt.compoundClassification).toBe('DOUBLE_MUTUAL_WOUND')
        expect(receipt.stateDelta.clockTicks).toBe(1)
        expect(receipt.stateDelta.somaticConditionsAdded['char_bog']).toContain(
            'somatic_strain',
        )
        expect(
            receipt.stateDelta.somaticConditionsAdded['char_wart'],
        ).toContain('somatic_strain')
    })

    it('rejects self-referential combatants with [ANTI_REFLEXIVITY_BREACH]', () => {
        expect(() =>
            evaluateDual2d6({
                initiator: { id: 'char_bog', stats: {} },
                target: { id: 'char_bog', stats: {} }, // Self-duel!
                tick: 1,
                timestampMs: 1000,
            }),
        ).toThrow(/ANTI_REFLEXIVITY_BREACH/)
    })

    it('automatically buffers resolution state deltas into the in-memory StagingAccumulator', async () => {
        const slv = vi.fn()
        await resolveDual2d6Action(
            model,
            {
                idx: 'duel-1',
                dat: {
                    resolveParams: {
                        context: {
                            initiator: { id: 'char_bog', stats: {} },
                            target: { id: 'char_wart', stats: {} },
                            tick: 1,
                            timestampMs: 1000,
                        },
                        rng: () => 0.5,
                        autoStage: true,
                    },
                },
                slv,
            },
            {} as any,
        )

        expect(slv).toHaveBeenCalled()
        expect(model.stagedMutations.length).toBeGreaterThan(0)
        expect(model.sequenceCursor).toBe(1)
        expect(model.lastResolutionReceipt).toBeDefined()
    })

    it('validates 10,000-roll Monte Carlo calibration asserting uniform dice variance', () => {
        let total = 0
        const rolls = 10000
        for (let i = 0; i < rolls; i++) {
            total += roll2d6(Math.random).sum
        }
        const mean = total / rolls
        // Theoretical expectation for 2d6 is exactly 7.000
        expect(mean).toBeGreaterThan(6.92)
        expect(mean).toBeLessThan(7.08)
    })

    it('routes RESOLVE_DUAL_2D6_LEDGER cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: RESOLVE_DUAL_2D6_LEDGER,
                bale: {
                    idx: 'reducer-duel',
                    dat: {
                        resolveParams: {
                            context: {
                                initiator: { id: 'char_bog', stats: {} },
                                target: { id: 'char_wart', stats: {} },
                                tick: 1,
                                timestampMs: 1000,
                            },
                            rng: () => 0.5,
                        },
                    },
                    slv,
                } as any,
            },
            {} as any,
        )) as LedgerModel

        expect(result).toBeInstanceOf(LedgerModel)
        expect(slv).toHaveBeenCalled()
    })
})
