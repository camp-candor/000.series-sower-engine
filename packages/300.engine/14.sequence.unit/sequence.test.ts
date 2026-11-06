import { describe, it, expect, vi, afterEach } from 'vitest'
import { SequenceModel } from './sequence.model.js'
import {
    initSequence,
    nextSequence,
    assertExpectedSeq,
    commitSequence,
    verifySequenceContinuity,
} from './buz/sequence.buzz.js'
import {

    NEXT_SEQUENCE,



} from './sequence.action.js'
import { reducer } from './sequence.reduce.js'

describe('14.sequence.unit - Monotonic Sequence & OCC Concurrency Gating Battery', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('initializes SequenceModel with default zero head sequence', () => {
        const model = new SequenceModel()
        expect(model.idx).toBe('14.sequence')
        expect(model.currentHeadSeq).toBe(0)
        expect(model.totalCommitted).toBe(0)
        expect(model.seriesSlug).toBe('wiregrass-basin')
    })

    it('initializes SequenceModel to a designated starting head integer', () => {
        const model = new SequenceModel()
        const slv = vi.fn()
        initSequence(model, { idx: 'init', val: 42, src: 'under-the-floorboards', slv }, {} as any)

        expect(model.currentHeadSeq).toBe(42)
        expect(model.seriesSlug).toBe('under-the-floorboards')
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                sequenceBit: expect.objectContaining({ val: 42, src: 'under-the-floorboards' }),
            }),
        )
    })

    it('calculates the next sequence integer without mutating head prematurely', () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 42

        let capturedNext = 0
        const slv = (res: any) => {
            capturedNext = res.nextSeq
        }

        nextSequence(model, { idx: 'next', slv }, {} as any)
        expect(capturedNext).toBe(43)
        expect(model.currentHeadSeq).toBe(42) // Must remain uncommitted
    })

    it('accepts clean sequence tokens where presented sequence matches head', async () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 100

        const slv = vi.fn()
        await assertExpectedSeq(model, { idx: 'assert', val: 100, slv }, {} as any)

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                report: expect.objectContaining({ valid: true, presentedSeq: 100 }),
                sequenceBit: expect.objectContaining({ val: 1, idx: 'assert-expected-seq-pass' }),
            }),
        )
    })

    it('rejects stale sequence tokens with OCC_SEQUENCE_CONFLICT', async () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 100

        const slv = vi.fn()
        await assertExpectedSeq(model, { idx: 'assert', val: 99, slv }, {} as any)

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                report: expect.objectContaining({
                    valid: false,
                    error: expect.stringContaining('OCC_SEQUENCE_CONFLICT'),
                }),
                sequenceBit: expect.objectContaining({ val: 0, idx: 'assert-expected-seq-fail' }),
            }),
        )
    })

    it('commits strictly monotonic sequential increments (seq_n + 1)', async () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 5

        const slv = vi.fn()
        await commitSequence(
            model,
            { idx: 'commit', val: 6, dat: { eventId: 'evt_genesis_01' }, slv },
            {} as any,
        )

        expect(model.currentHeadSeq).toBe(6)
        expect(model.totalCommitted).toBe(1)
        expect(model.lastCommittedEventId).toBe('evt_genesis_01')
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                committedSeq: 6,
                sequenceBit: expect.objectContaining({ val: 6, idx: 'commit-sequence-pass' }),
            }),
        )
    })

    it('aborts out-of-order sequence commits with SEQUENCE_VIOLATION', async () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 5

        const slv = vi.fn()
        await commitSequence(model, { idx: 'commit', val: 7, slv }, {} as any) // Jumped from 5 to 7

        expect(model.currentHeadSeq).toBe(5) // Unmutated
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.stringContaining('SEQUENCE_VIOLATION'),
                sequenceBit: expect.objectContaining({ val: 0, idx: 'commit-sequence-fail' }),
            }),
        )
    })

    it('verifies a strictly contiguous array of event sequence IDs', async () => {
        const model = new SequenceModel()
        const envelopes = [
            { sequenceId: 1 },
            { sequenceId: 2 },
            { sequenceId: 3 },
            { sequenceId: 4 },
        ]

        const slv = vi.fn()
        await verifySequenceContinuity(
            model,
            { idx: 'verify', dat: { envelopes }, slv },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                continuityReport: expect.objectContaining({
                    valid: true,
                    totalItems: 4,
                    baseSeq: 1,
                    headSeq: 4,
                }),
                sequenceBit: expect.objectContaining({ val: 1 }),
            }),
        )
    })

    it('detects and reports gaps in discontinuous sequence arrays', async () => {
        const model = new SequenceModel()
        const envelopes = [
            { sequenceId: 10 },
            { sequenceId: 11 },
            { sequenceId: 13 }, // Gap at index 2 (skipped 12)
        ]

        const slv = vi.fn()
        await verifySequenceContinuity(
            model,
            { idx: 'verify', dat: { envelopes }, slv },
            {} as any,
        )

        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                continuityReport: expect.objectContaining({
                    valid: false,
                    gapIndex: 2,
                    error: expect.stringContaining('SEQUENCE_GAP_DETECTED'),
                }),
                sequenceBit: expect.objectContaining({ val: 0 }),
            }),
        )
    })

    it('routes actions through pure sequence reducer router via clone-deep', async () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 10

        const slv = vi.fn()
        const nextModel = (await reducer(
            model,
            { type: NEXT_SEQUENCE, bale: { idx: 'next', slv } as any },
            {} as any,
        )) as SequenceModel

        expect(nextModel).toBeInstanceOf(SequenceModel)
        expect(slv).toHaveBeenCalled()
    })
})
