import { describe, it, expect, beforeEach } from 'vitest'
import { SequenceModel } from './sequence.model'
import {
    initSequence,
    nextSequence,
    assertExpectedSeq,
    verifySequenceContinuity,
    commitSequence,
} from './sequence.buzzer'

describe('14.sequence.unit - Monotonic Sequence & OCC Gate', () => {
    let model: SequenceModel
    const mockState: any = { hunt: async () => ({}) }

    beforeEach(async () => {
        model = new SequenceModel()
        await initSequence(
            model,
            { idx: 'test-init', src: 'test-stream', val: 10 },
            mockState,
        )
    })

    it('calculates the next sequential integer correctly', () => {
        let next: number | undefined
        nextSequence(
            model,
            {
                idx: 'test-next',
                src: 'test-stream',
                slv: (r) => {
                    next = r.nextSeq
                },
            },
            mockState,
        )
        expect(next).toBe(11)
    })

    it('validates OCC expected sequence matching the active head', async () => {
        let resultReport: any
        await assertExpectedSeq(
            model,
            {
                idx: 'test-occ',
                src: 'test-stream',
                val: 10,
                slv: (r) => {
                    resultReport = r.report
                },
            },
            mockState,
        )
        expect(resultReport.valid).toBe(true)
        expect(resultReport.error).toBeUndefined()
    })

    it('rejects stale sequence tokens with an OCC sequence conflict', async () => {
        let resultReport: any
        let errStr: string | undefined
        await assertExpectedSeq(
            model,
            {
                idx: 'test-occ-stale',
                src: 'test-stream',
                val: 9,
                slv: (r) => {
                    resultReport = r.report
                    errStr = r.err
                },
            },
            mockState,
        )
        expect(resultReport.valid).toBe(false)
        expect(errStr).toContain('OCC_SEQUENCE_CONFLICT')
    })

    it('enforces monotonic sequence increment during commit', async () => {
        let committedSeq: number | undefined
        await commitSequence(
            model,
            {
                idx: 'test-commit',
                src: 'test-stream',
                val: 11,
                dat: { eventId: 'evt_11', timestampMs: 1000 },
                slv: (r) => {
                    committedSeq = r.seqBit?.val
                },
            },
            mockState,
        )
        expect(committedSeq).toBe(11)
        expect(model.streams['test-stream'].headSeq).toBe(11)
    })

    it('detects sequence gaps in a batch of event sequence IDs', () => {
        let reportOk: any
        verifySequenceContinuity(
            model,
            {
                idx: 'test-cont-ok',
                lst: [1, 2, 3, 4, 5],
                slv: (r) => {
                    reportOk = r.report
                },
            },
            mockState,
        )
        expect(reportOk.valid).toBe(true)

        let reportGap: any
        verifySequenceContinuity(
            model,
            {
                idx: 'test-cont-gap',
                lst: [1, 2, 4, 5],
                slv: (r) => {
                    reportGap = r.report
                },
            },
            mockState,
        )
        expect(reportGap.valid).toBe(false)
        expect(reportGap.error).toContain('SEQUENCE_GAP_DETECTED')
    })
})
