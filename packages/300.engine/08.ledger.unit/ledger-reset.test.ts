import { describe, it, expect, vi, afterEach } from 'vitest'
import { LedgerModel } from './ledger.model.js'
import { resetLedgerAction } from './buz/ledger.buzz.js'
import { RESET_LEDGER } from './ledger.action.js'
import { reducer } from './ledger.reduce.js'

function seedStaging(model: LedgerModel): void {
    model.stagedMutations = [
        {
            mutationId: 'stg_somatic_trauma_1',
            sequenceNumber: 1,
            tick: 1,
            mutationType: 'SOMATIC_TRAUMA',
            entityId: 'char_joker',
            payload: { fatigueBps: 2500 },
            timestampMs: 1700000000000,
        },
        {
            mutationId: 'stg_string_2',
            sequenceNumber: 2,
            tick: 1,
            mutationType: 'STRING_EXCHANGE',
            entityId: 'char_batman',
            targetId: 'char_joker',
            payload: { holderId: 'char_batman', debtorId: 'char_joker' },
            timestampMs: 1700000000000,
        },
        {
            mutationId: 'stg_paranoia_3',
            sequenceNumber: 3,
            tick: 1,
            mutationType: 'PARANOIA_TICK',
            entityId: 'char_joker',
            payload: { valueBps: 1000 },
            timestampMs: 1700000000000,
        },
    ] as any
    model.sequenceCursor = 3
    model.lastCommitResult = {
        success: true,
        eventsApplied: 2,
        stateHash: 'sha256_test',
        committedMutations: [],
        timestampMs: 1700000000000,
    } as any
    model.lastResolutionReceipt = {
        resolverId: 'dual_2d6_v1',
        initiatorId: 'char_batman',
        targetId: 'char_joker',
    } as any
}

describe('08.ledger.unit - Volatile Staging Reset (Phase 3)', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('purges staged mutations and duel receipts with pass receipt', async () => {
        const model = new LedgerModel()
        seedStaging(model)

        const slv = vi.fn()
        await resetLedgerAction(model, { idx: 'reset', slv } as any, {} as any)

        expect(model.stagedMutations.length).toBe(0)
        expect(model.sequenceCursor).toBe(0)
        expect(model.lastCommitResult).toBeUndefined()
        expect(model.lastResolutionReceipt).toBeUndefined()
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                ledgerBit: expect.objectContaining({
                    idx: 'reset-ledger-pass',
                    val: 0,
                    dat: expect.objectContaining({
                        discardedMutationsCount: 3,
                        stagedMutationsRemaining: 0,
                        sequenceCursor: 0,
                    }),
                }),
            }),
        )
    })

    it('routes RESET_LEDGER through the reducer', async () => {
        const model = new LedgerModel()
        seedStaging(model)

        const slv = vi.fn()
        const result = (await reducer(
            model,
            { type: RESET_LEDGER, bale: { idx: 'reset', slv } as any },
            {} as any,
        )) as LedgerModel

        expect(result.stagedMutations.length).toBe(0)
        expect(result.sequenceCursor).toBe(0)
        expect(result.lastCommitResult).toBeUndefined()
        expect(result.lastResolutionReceipt).toBeUndefined()
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                ledgerBit: expect.objectContaining({
                    idx: 'reset-ledger-pass',
                }),
            }),
        )
    })
})
