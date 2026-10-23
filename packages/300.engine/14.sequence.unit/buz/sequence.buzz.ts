import type { SequenceModel } from '../sequence.model'
import type SequenceBit from '../fce/sequence.bit'
import type State from '../../99.core/state'
import type {
    SequenceValidationReport,
    StreamSequenceState,
} from '../fce/sequence.interface'

export const emitConsole = async (
    ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
            return
        } catch {
            // Non-blocking degradation
        }
    }
}

export const initSequence = async (
    cpy: SequenceModel,
    bal: SequenceBit,
    ste: State,
): Promise<SequenceModel> => {
    const streamId = bal?.src || cpy.defaultStreamId
    const initialSeq = typeof bal?.val === 'number' ? bal.val : 0

    cpy.streams[streamId] = {
        streamId,
        headSeq: initialSeq,
        lastEventId: (bal?.dat as any)?.lastEventId || '0'.repeat(64),
        updatedAtMs: (bal?.dat as any)?.timestampMs || 0,
    }

    if (ste?.value?.sequence) {
        ste.value.sequence.streams = cpy.streams
    }

    await emitConsole(
        ste,
        `>> [SEQUENCE:INIT] [OK] Stream '${streamId}' initialized at Seq #${initialSeq}`,
    )

    if (bal?.slv) {
        bal.slv({
            seqBit: { idx: 'init-sequence', src: streamId, val: initialSeq },
            stream: cpy.streams[streamId],
        })
    }
    return cpy
}

export const updateSequence = async (
    cpy: SequenceModel,
    bal: SequenceBit,
    _ste: State,
): Promise<SequenceModel> => {
    const streamId = bal?.src || cpy.defaultStreamId
    const stream = cpy.streams[streamId]

    if (bal?.slv) {
        bal.slv({
            seqBit: {
                idx: 'update-sequence',
                src: streamId,
                val: stream?.headSeq ?? 0,
            },
            stream,
        })
    }
    return cpy
}

export const nextSequence = (
    cpy: SequenceModel,
    bal: SequenceBit,
    _ste: State,
): SequenceModel => {
    const streamId = bal?.src || cpy.defaultStreamId
    const current = cpy.streams[streamId] || {
        streamId,
        headSeq: 0,
        lastEventId: '0'.repeat(64),
        updatedAtMs: 0,
    }

    const next = current.headSeq + 1

    if (bal?.slv) {
        bal.slv({
            seqBit: { idx: 'next-sequence', src: streamId, val: next },
            nextSeq: next,
        })
    }
    return cpy
}

export const assertExpectedSeq = async (
    cpy: SequenceModel,
    bal: SequenceBit,
    ste: State,
): Promise<SequenceModel> => {
    const streamId = bal?.src || cpy.defaultStreamId
    const expectedSeq =
        typeof bal?.val === 'number' ? bal.val : (bal?.dat as any)?.expectedSeq
    const current = cpy.streams[streamId]
    const actualHead = current ? current.headSeq : 0

    if (expectedSeq === undefined || expectedSeq === null) {
        const err = `[OCC_ERROR] Missing expectedSeq parameter for stream '${streamId}'`
        await emitConsole(ste, `:: ${err}`)
        if (bal?.slv)
            bal.slv({
                err,
                report: {
                    valid: false,
                    expectedSeq: -1,
                    actualSeq: actualHead,
                    error: err,
                },
            })
        return cpy
    }

    const valid = expectedSeq === actualHead
    const report: SequenceValidationReport = {
        valid,
        expectedSeq,
        actualSeq: actualHead,
        error: valid
            ? undefined
            : `[OCC_SEQUENCE_CONFLICT] Stale sequence token: expected Seq #${expectedSeq} but active head is Seq #${actualHead}`,
    }

    if (!valid) {
        await emitConsole(ste, `:: [SEQUENCE:OCC_FAIL] ${report.error}`)
    }

    if (bal?.slv) {
        bal.slv({
            seqBit: {
                idx: valid ? 'assert-expected-seq' : 'assert-expected-seq-fail',
                val: actualHead,
            },
            report,
            err: report.error,
        })
    }
    return cpy
}

export const verifySequenceContinuity = (
    cpy: SequenceModel,
    bal: SequenceBit,
    _ste: State,
): SequenceModel => {
    const sequences: number[] = Array.isArray(bal?.lst)
        ? bal.lst
        : (bal?.dat as any)?.sequences || []

    if (sequences.length === 0) {
        const report: SequenceValidationReport = {
            valid: true,
            expectedSeq: 0,
            actualSeq: 0,
        }
        if (bal?.slv) bal.slv({ report })
        return cpy
    }

    let valid = true
    let error: string | undefined

    for (let i = 1; i < sequences.length; i++) {
        const prev = sequences[i - 1]
        const curr = sequences[i]
        if (curr !== prev + 1) {
            valid = false
            error = `[SEQUENCE_GAP_DETECTED] Non-monotonic sequence gap between #${prev} and #${curr}`
            break
        }
    }

    const report: SequenceValidationReport = {
        valid,
        expectedSeq: sequences[sequences.length - 1],
        actualSeq: sequences[0],
        error,
    }

    if (bal?.slv) {
        bal.slv({
            seqBit: {
                idx: valid
                    ? 'verify-sequence-continuity'
                    : 'verify-sequence-continuity-fail',
            },
            report,
            err: error,
        })
    }
    return cpy
}

export const commitSequence = async (
    cpy: SequenceModel,
    bal: SequenceBit,
    ste: State,
): Promise<SequenceModel> => {
    const streamId = bal?.src || cpy.defaultStreamId
    const newSeq =
        typeof bal?.val === 'number' ? bal.val : (bal?.dat as any)?.newSeq
    const eventId = (bal?.dat as any)?.eventId || 'evt_unknown'
    const timestampMs = (bal?.dat as any)?.timestampMs || 0

    const current = cpy.streams[streamId] || {
        streamId,
        headSeq: 0,
        lastEventId: '0'.repeat(64),
        updatedAtMs: 0,
    }

    if (newSeq !== current.headSeq + 1) {
        const err = `[SEQUENCE_VIOLATION] Cannot commit Seq #${newSeq}: current head is #${current.headSeq}`
        await emitConsole(ste, `:: [SEQUENCE:COMMIT_FAIL] ${err}`)
        if (bal?.slv) bal.slv({ err })
        return cpy
    }

    cpy.streams[streamId] = {
        streamId,
        headSeq: newSeq,
        lastEventId: eventId,
        updatedAtMs: timestampMs,
    }

    if (ste?.value?.sequence) {
        ste.value.sequence.streams = cpy.streams
    }

    await emitConsole(
        ste,
        `>> [SEQUENCE:COMMIT] [OK] Stream '${streamId}' advanced to Seq #${newSeq} (${eventId})`,
    )

    if (bal?.slv) {
        bal.slv({
            seqBit: { idx: 'commit-sequence', src: streamId, val: newSeq },
            stream: cpy.streams[streamId],
        })
    }
    return cpy
}

export const resetSequence = (
    cpy: SequenceModel,
    bal: SequenceBit,
    ste: State,
): SequenceModel => {
    const streamId = bal?.src || cpy.defaultStreamId
    cpy.streams[streamId] = {
        streamId,
        headSeq: 0,
        lastEventId: '0'.repeat(64),
        updatedAtMs: 0,
    }

    if (ste?.value?.sequence) {
        ste.value.sequence.streams = cpy.streams
    }

    if (bal?.slv) {
        bal.slv({ seqBit: { idx: 'reset-sequence', src: streamId, val: 0 } })
    }
    return cpy
}
