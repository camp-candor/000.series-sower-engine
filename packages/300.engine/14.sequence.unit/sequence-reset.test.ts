import { describe, it, expect, vi, afterEach } from 'vitest'
import { SequenceModel } from './sequence.model.js'
import { resetSequenceAction } from './buz/sequence.buzz.js'
import { RESET_SEQUENCE } from './sequence.action.js'
import { reducer } from './sequence.reduce.js'

describe('14.sequence.unit - Monotonic Head Reset (Phase 3)', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('restores the monotonic head to zero with pass receipt', async () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 12
        model.seriesSlug = 'gotham-trinity-crisis'
        model.epochVersion = 4
        model.lastCommittedEventId = 'evt_0012'
        model.totalCommitted = 12

        const slv = vi.fn()
        await resetSequenceAction(
            model,
            { idx: 'reset', slv } as any,
            {} as any,
        )

        expect(model.currentHeadSeq).toBe(0)
        expect(model.seriesSlug).toBe('')
        expect(model.epochVersion).toBe(1)
        expect(model.lastCommittedEventId).toBe('')
        expect(model.totalCommitted).toBe(0)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                sequenceBit: expect.objectContaining({
                    idx: 'reset-sequence-pass',
                    val: 0,
                    dat: expect.objectContaining({
                        previousHeadSeq: 12,
                        previousTotalCommitted: 12,
                        currentHeadSeq: 0,
                        epochVersion: 1,
                    }),
                }),
            }),
        )
    })

    it('routes RESET_SEQUENCE through the reducer', async () => {
        const model = new SequenceModel()
        model.currentHeadSeq = 47
        model.seriesSlug = 'gotham-trinity-crisis'
        model.epochVersion = 3
        model.lastCommittedEventId = 'evt_0047'
        model.totalCommitted = 47

        const slv = vi.fn()
        const result = (await reducer(
            model,
            { type: RESET_SEQUENCE, bale: { idx: 'reset', slv } as any },
            {} as any,
        )) as SequenceModel

        expect(result.currentHeadSeq).toBe(0)
        expect(result.seriesSlug).toBe('')
        expect(result.epochVersion).toBe(1)
        expect(result.lastCommittedEventId).toBe('')
        expect(result.totalCommitted).toBe(0)
        expect(slv).toHaveBeenCalledWith(
            expect.objectContaining({
                sequenceBit: expect.objectContaining({
                    idx: 'reset-sequence-pass',
                }),
            }),
        )
    })
})
