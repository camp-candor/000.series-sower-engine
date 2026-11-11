/**
 * 11.belief.unit - Somatic Sensory Impairment Filter Gate
 * Evaluates biological receptor trauma, orientation cones, and acoustic thresholds.
 */
import type {
    PerceptCandidate,
    SomaticSensoryProfile,
    SensoryFilterEvaluation,
} from '../fce/percept.interface.js'

export const CONCUSSION_ACOUSTIC_ELEVATION_CDB = 1500 // +15 dB required for concussed ears

export const evaluateSensoryFilter = (
    percept: PerceptCandidate,
    profile: SomaticSensoryProfile,
): SensoryFilterEvaluation => {
    // 1. Hard Physical Occlusion Check
    if (percept.isOccluded) {
        return Object.freeze({
            received: false,
            effectiveQualityBps: 0,
            rejectionReason: 'GEOMETRIC_OCCLUSION',
        })
    }

    // 2. Optical Sensory Channel Evaluation
    if (percept.channel === 'OPTICAL') {
        if (profile.visualAcuity === 'BLIND') {
            return Object.freeze({
                received: false,
                effectiveQualityBps: 0,
                rejectionReason: 'SOMATIC_OPTICAL_BLINDNESS',
            })
        }

        if (
            profile.visualAcuity === 'MONOCULAR' &&
            percept.bearingDegrees !== null
        ) {
            // Map 0..359 degrees to 0..5 hex sector (60 deg per sector)
            const targetSector = Math.floor(percept.bearingDegrees / 60) % 6
            const facingSector = Math.max(0, Math.min(5, profile.facingSector))

            // Calculate angular sector delta on modulo-6 ring: min((B - F) % 6, (F - B) % 6)
            const sectorDelta = Math.min(
                (targetSector - facingSector + 6) % 6,
                (facingSector - targetSector + 6) % 6,
            )

            // Monocular vision clamps field of view to 120-degree cone (sector delta <= 1)
            if (sectorDelta > 1) {
                return Object.freeze({
                    received: false,
                    effectiveQualityBps: 0,
                    rejectionReason: 'MONOCULAR_BLIND_SECTOR',
                })
            }
        }

        // Optical quality scales from SNR margin into basis points [1000..10000]
        const effectiveQualityBps = Math.min(
            10000,
            Math.max(1000, percept.snrMarginCdB * 2),
        )
        return Object.freeze({
            received: true,
            effectiveQualityBps,
        })
    }

    // 3. Acoustic Sensory Channel Evaluation
    if (percept.channel === 'ACOUSTIC') {
        let effectiveHearingThreshold = profile.hearingThresholdCdB
        if (profile.hasConcussiveDeafness) {
            effectiveHearingThreshold += CONCUSSION_ACOUSTIC_ELEVATION_CDB
        }

        if (percept.signalCdB < effectiveHearingThreshold) {
            return Object.freeze({
                received: false,
                effectiveQualityBps: 0,
                rejectionReason: 'BELOW_HEARING_THRESHOLD',
            })
        }

        if (percept.snrMarginCdB <= 0) {
            return Object.freeze({
                received: false,
                effectiveQualityBps: 0,
                rejectionReason: 'SIGNAL_DAMPED_INTO_AMBIENCE',
            })
        }

        // Acoustic quality derived from SNR margin
        const effectiveQualityBps = Math.min(
            10000,
            Math.max(1000, percept.snrMarginCdB * 2),
        )
        return Object.freeze({
            received: true,
            effectiveQualityBps,
        })
    }

    return Object.freeze({
        received: false,
        effectiveQualityBps: 0,
        rejectionReason: 'GEOMETRIC_OCCLUSION',
    })
}
