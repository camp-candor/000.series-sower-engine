/**
 * 11.belief.unit - Percept Candidate Geometry Ingestion Parser
 * Validates plain geometric evidence received from the spatial oracle.
 */
import type {
    PerceptCandidate,
    SensoryChannel,
} from '../fce/percept.interface.js'

export const parsePerceptCandidate = (candidate: any): PerceptCandidate => {
    if (!candidate || typeof candidate !== 'object') {
        throw new Error(
            '[PERCEPT_INGEST_ERROR] PerceptCandidate must be an object',
        )
    }

    const channel: SensoryChannel =
        candidate.channel === 'ACOUSTIC' ? 'ACOUSTIC' : 'OPTICAL'

    if (
        !Number.isInteger(candidate.sourceCell) ||
        !Number.isInteger(candidate.observerCell)
    ) {
        throw new Error(
            '[PERCEPT_INGEST_ERROR] sourceCell and observerCell must be packed integers',
        )
    }

    const signalCdB = Number.isInteger(candidate.signalCdB)
        ? candidate.signalCdB
        : 0
    const ambientNoiseCdB = Number.isInteger(candidate.ambientNoiseCdB)
        ? candidate.ambientNoiseCdB
        : 0
    const snrMarginCdB = Number.isInteger(candidate.snrMarginCdB)
        ? candidate.snrMarginCdB
        : signalCdB - ambientNoiseCdB

    const bearingDegrees =
        candidate.bearingDegrees !== null &&
        Number.isInteger(candidate.bearingDegrees)
            ? Math.max(0, Math.min(359, candidate.bearingDegrees))
            : null

    return Object.freeze({
        schemaVersion: candidate.schemaVersion ?? 1,
        kernelVersion: candidate.kernelVersion ?? '1.0.0',
        topologyHash: candidate.topologyHash ?? '',
        overlayHash: candidate.overlayHash ?? '',
        queryHash: candidate.queryHash ?? '',
        receiptHash: candidate.receiptHash ?? '',
        channel,
        sourceCell: candidate.sourceCell,
        observerCell: candidate.observerCell,
        signalCdB,
        ambientNoiseCdB,
        snrMarginCdB,
        bearingDegrees,
        isOccluded: Boolean(candidate.isOccluded),
    })
}
