/**
 * 14.sequence.unit - Sequence Buzz Handlers
 * Deterministic monotonic progression, OCC validation, and continuity checks.
 */
import { SequenceModel } from '../sequence.model.js'
import type SequenceBit from '../fce/sequence.bit.js'
import type {
    SequenceValidationReport,
    SequenceContinuityReport,
} from '../fce/sequence.interface.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export const initSequence = (
    cpy: SequenceModel,
    bal?: SequenceBit,
    _ste?: State,
): SequenceModel => {
    if (bal?.val !== undefined && Number.isInteger(bal.val) && bal.val >= 0) {
        cpy.currentHeadSeq = bal.val
    } else if (
        bal?.dat?.currentHeadSeq !== undefined &&
        Number.isInteger(bal.dat.currentHeadSeq) &&
        bal.dat.currentHeadSeq >= 0
    ) {
        cpy.currentHeadSeq = bal.dat.currentHeadSeq
    } else {
        cpy.currentHeadSeq = 0
    }

    if (bal?.src) {
        cpy.seriesSlug = bal.src
    }

    if (bal?.slv) {
        bal.slv({
            sequenceBit: {
                idx: 'init-sequence',
                val: cpy.currentHeadSeq,
                src: cpy.seriesSlug,
            },
        })
    }
    return cpy
}

export const updateSequence = (
    cpy: SequenceModel,
    bal?: SequenceBit,
    _ste?: State,
): SequenceModel => {
    if (bal?.slv) {
        bal.slv({
            sequenceBit: {
                idx: 'update-sequence',
                val: cpy.currentHeadSeq,
                src: cpy.seriesSlug,
            },
        })
    }
    return cpy
}

export const nextSequence = (
    cpy: SequenceModel,
    bal?: SequenceBit,
    _ste?: State,
): SequenceModel => {
    const calculatedNext = cpy.currentHeadSeq + 1
    if (bal?.slv) {
        bal.slv({
            nextSeq: calculatedNext,
            sequenceBit: {
                idx: 'next-sequence',
                val: calculatedNext,
                src: cpy.seriesSlug,
            },
        })
    }
    return cpy
}

export const assertExpectedSeq = async (
    cpy: SequenceModel,
    bal: SequenceBit,
    ste?: State,
): Promise<SequenceModel> => {
    const presented =
        bal.val !== undefined
            ? bal.val
            : bal.dat?.expectedSeq !== undefined
              ? bal.dat.expectedSeq
              : -1

    const isMatch = presented === cpy.currentHeadSeq

    let error: string | undefined
    if (!isMatch) {
        error = `[OCC_SEQUENCE_CONFLICT] Head sequence token mismatch. Expected: ${cpy.currentHeadSeq}, Presented: ${presented}`
        await emitConsole(ste, `:: [FAIL] ${error}`)
    } else {
        await emitConsole(
            ste,
            `>> [SEQ:OCC_PASS] Sequence token validated at head #${cpy.currentHeadSeq}`,
        )
    }

    const report: SequenceValidationReport = {
        valid: isMatch,
        expectedSeq: cpy.currentHeadSeq,
        presentedSeq: presented,
        currentHeadSeq: cpy.currentHeadSeq,
        error,
        timestamp: new Date().toISOString(),
    }

    if (bal.slv) {
        bal.slv({
            report,
            sequenceBit: {
                idx: isMatch ? 'assert-expected-seq-pass' : 'assert-expected-seq-fail',
                val: isMatch ? 1 : 0,
                src: cpy.seriesSlug,
                dat: { report, error },
            },
        })
    }

    return cpy
}

export const commitSequence = async (
    cpy: SequenceModel,
    bal: SequenceBit,
    ste?: State,
): Promise<SequenceModel> => {
    const candidateSeq =
        bal.val !== undefined
            ? bal.val
            : bal.dat?.incomingSeq !== undefined
              ? bal.dat.incomingSeq
              : -1

    const expectedNext = cpy.currentHeadSeq + 1

    if (candidateSeq !== expectedNext) {
        const error = `[SEQUENCE_VIOLATION] Invalid sequence increment. Expected seq #${expectedNext}, Received seq #${candidateSeq}`
        await emitConsole(ste, `:: [FAIL] ${error}`)
        if (bal.slv) {
            bal.slv({
                err: error,
                sequenceBit: {
                    idx: 'commit-sequence-fail',
                    val: 0,
                    src: cpy.seriesSlug,
                    dat: { error },
                },
            })
        }
        return cpy
    }

    cpy.currentHeadSeq = candidateSeq
    cpy.totalCommitted += 1
    if (bal.dat?.eventId) {
        cpy.lastCommittedEventId = bal.dat.eventId
    }

    await emitConsole(
        ste,
        `>> [SEQ:COMMIT] Monotonic sequence advanced to #${cpy.currentHeadSeq} (Total: ${cpy.totalCommitted})`,
    )

    if (bal.slv) {
        bal.slv({
            committedSeq: cpy.currentHeadSeq,
            sequenceBit: {
                idx: 'commit-sequence-pass',
                val: cpy.currentHeadSeq,
                src: cpy.seriesSlug,
                dat: {
                    currentHeadSeq: cpy.currentHeadSeq,
                    totalCommitted: cpy.totalCommitted,
                },
            },
        })
    }

    return cpy
}

export const verifySequenceContinuity = async (
    cpy: SequenceModel,
    bal: SequenceBit,
    ste?: State,
): Promise<SequenceModel> => {
    const envelopes = bal.dat?.envelopes ?? []
    if (envelopes.length === 0) {
        const report: SequenceContinuityReport = {
            valid: true,
            totalItems: 0,
            baseSeq: cpy.currentHeadSeq,
            headSeq: cpy.currentHeadSeq,
        }
        if (bal.slv) {
            bal.slv({
                continuityReport: report,
                sequenceBit: {
                    idx: 'verify-continuity-pass',
                    val: 1,
                    dat: { continuityReport: report },
                },
            })
        }
        return cpy
    }

    const baseSeq = envelopes[0].sequenceId
    let previousSeq = baseSeq
    let valid = true
    let gapIndex: number | undefined
    let error: string | undefined

    for (let i = 1; i < envelopes.length; i++) {
        const currentSeq = envelopes[i].sequenceId
        if (currentSeq !== previousSeq + 1) {
            valid = false
            gapIndex = i
            error = `[SEQUENCE_GAP_DETECTED] Gap detected at index ${i}: Expected #${previousSeq + 1}, Found #${currentSeq}`
            await emitConsole(ste, `:: [FAIL] ${error}`)
            break
        }
        previousSeq = currentSeq
    }

    const headSeq = envelopes[envelopes.length - 1].sequenceId
    const report: SequenceContinuityReport = {
        valid,
        totalItems: envelopes.length,
        baseSeq,
        headSeq,
        gapIndex,
        error,
    }

    if (valid) {
        await emitConsole(
            ste,
            `>> [SEQ:CONTINUITY] Contiguous sequence verified from #${baseSeq} to #${headSeq} (${envelopes.length} records)`,
        )
    }

    if (bal.slv) {
        bal.slv({
            continuityReport: report,
            sequenceBit: {
                idx: valid
                    ? 'verify-continuity-pass'
                    : 'verify-continuity-fail',
                val: valid ? 1 : 0,
                src: cpy.seriesSlug,
                dat: { continuityReport: report, error },
            },
        })
    }

    return cpy
}

