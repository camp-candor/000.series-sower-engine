/**
 * 11.belief.unit - Percept Candidate & Somatic Filter Interfaces
 * Structured physical evidence emitted by spatial oracles prior to belief synthesis.
 */

export type SensoryChannel = 'OPTICAL' | 'ACOUSTIC'
export type VisualAcuity = 'NORMAL' | 'MONOCULAR' | 'BLIND'

export interface SpatialReceiptMetadata {
    readonly schemaVersion: number
    readonly kernelVersion: string
    readonly topologyHash: string
    readonly overlayHash: string
    readonly queryHash: string
    readonly receiptHash: string
}

export interface PerceptCandidate extends SpatialReceiptMetadata {
    readonly channel: SensoryChannel
    readonly sourceCell: number // PackedAxial
    readonly observerCell: number // PackedAxial
    readonly signalCdB: number // Integer centi-decibels
    readonly ambientNoiseCdB: number // Integer centi-decibels
    readonly snrMarginCdB: number // signalCdB - ambientNoiseCdB
    readonly bearingDegrees: number | null // 0..359 relative or null if co-located
    readonly isOccluded: boolean
}

export interface SomaticSensoryProfile {
    readonly actorId: string
    readonly visualAcuity: VisualAcuity
    readonly facingSector: number // Integer 0..5 (60 deg sectors on hex lattice)
    readonly hasConcussiveDeafness: boolean
    readonly hearingThresholdCdB: number // Integer centi-decibels (default 2000 cdB)
}

export interface SensoryFilterEvaluation {
    readonly received: boolean
    readonly effectiveQualityBps: number // Integer basis points [0, 10000]
    readonly rejectionReason?:
        | 'GEOMETRIC_OCCLUSION'
        | 'SOMATIC_OPTICAL_BLINDNESS'
        | 'MONOCULAR_BLIND_SECTOR'
        | 'BELOW_HEARING_THRESHOLD'
        | 'SIGNAL_DAMPED_INTO_AMBIENCE'
}
