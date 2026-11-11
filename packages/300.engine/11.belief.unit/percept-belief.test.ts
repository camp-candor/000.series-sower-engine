import { describe, it, expect, beforeEach } from 'vitest'
import { BeliefModel } from './belief.model.js'
import {
    initBelief,
    evaluateSensoryFilter,
    deriveBeliefFromPercept,
    combineBeliefConfidencesNoisyOr,
} from './belief.buzzer.js'
import type {
    PerceptCandidate,
    SomaticSensoryProfile,
} from './fce/percept.interface.js'

describe('11.belief.unit - Sensory Perception Evidence Transformation to Belief Records Battery', () => {
    let model: BeliefModel

    const validReceipt = {
        schemaVersion: 1,
        kernelVersion: '1.0.0',
        topologyHash: 'topo_sha256',
        overlayHash: 'overlay_sha256',
        queryHash: 'query_sha256',
        receiptHash: 'receipt_sha256_abcdef0123456789',
    }

    beforeEach(async () => {
        model = new BeliefModel()
        await initBelief(model)
    })

    it('optical blindness gate completely intercepts clear visual line of sight', () => {
        const opticalPercept: PerceptCandidate = {
            ...validReceipt,
            channel: 'OPTICAL',
            sourceCell: 100,
            observerCell: 101,
            signalCdB: 8000,
            ambientNoiseCdB: 2000,
            snrMarginCdB: 6000,
            bearingDegrees: 0,
            isOccluded: false,
        }

        const blindProfile: SomaticSensoryProfile = {
            actorId: 'char_spleen',
            visualAcuity: 'BLIND',
            facingSector: 0,
            hasConcussiveDeafness: false,
            hearingThresholdCdB: 2000,
        }

        const filter = evaluateSensoryFilter(opticalPercept, blindProfile)
        expect(filter.received).toBe(false)
        expect(filter.rejectionReason).toBe('SOMATIC_OPTICAL_BLINDNESS')

        const belief = deriveBeliefFromPercept(
            'char_spleen',
            'evt_001',
            'fact_bog_struck_spleen',
            'char_bog',
            'struck',
            'char_spleen',
            opticalPercept,
            filter,
        )

        // Ignorance by Omission: zero belief record created
        expect(belief).toBeNull()
    })

    it('monocular vision enforces 120-degree facing cone clamp', () => {
        const monocularProfile: SomaticSensoryProfile = {
            actorId: 'char_wart',
            visualAcuity: 'MONOCULAR',
            facingSector: 0, // Facing North (Sector 0)
            hasConcussiveDeafness: false,
            hearingThresholdCdB: 2000,
        }

        // Bearing 0 degrees (Sector 0: directly in front) -> PASS
        const inConePercept: PerceptCandidate = {
            ...validReceipt,
            channel: 'OPTICAL',
            sourceCell: 100,
            observerCell: 101,
            signalCdB: 8000,
            ambientNoiseCdB: 2000,
            snrMarginCdB: 6000,
            bearingDegrees: 10,
            isOccluded: false,
        }

        const inConeFilter = evaluateSensoryFilter(
            inConePercept,
            monocularProfile,
        )
        expect(inConeFilter.received).toBe(true)
        expect(inConeFilter.effectiveQualityBps).toBeGreaterThanOrEqual(1000)

        // Bearing 180 degrees (Sector 3: directly behind) -> REJECT
        const outConePercept: PerceptCandidate = {
            ...inConePercept,
            bearingDegrees: 180,
        }

        const outConeFilter = evaluateSensoryFilter(
            outConePercept,
            monocularProfile,
        )
        expect(outConeFilter.received).toBe(false)
        expect(outConeFilter.rejectionReason).toBe('MONOCULAR_BLIND_SECTOR')
    })

    it('concussive deafness elevates hearing threshold by +1500 cdB', () => {
        const concussedProfile: SomaticSensoryProfile = {
            actorId: 'char_moss',
            visualAcuity: 'NORMAL',
            facingSector: 0,
            hasConcussiveDeafness: true,
            hearingThresholdCdB: 2000, // Effective threshold: 3500 cdB
        }

        // Sound arriving at 2800 cdB (audible to healthy ear, damped by concussion)
        const faintAcoustic: PerceptCandidate = {
            ...validReceipt,
            channel: 'ACOUSTIC',
            sourceCell: 200,
            observerCell: 205,
            signalCdB: 2800,
            ambientNoiseCdB: 1500,
            snrMarginCdB: 1300,
            bearingDegrees: 90,
            isOccluded: false,
        }

        const faintFilter = evaluateSensoryFilter(
            faintAcoustic,
            concussedProfile,
        )
        expect(faintFilter.received).toBe(false)
        expect(faintFilter.rejectionReason).toBe('BELOW_HEARING_THRESHOLD')

        // Loud sound arriving at 4000 cdB -> PASS
        const loudAcoustic: PerceptCandidate = {
            ...faintAcoustic,
            signalCdB: 4000,
            snrMarginCdB: 2500,
        }

        const loudFilter = evaluateSensoryFilter(loudAcoustic, concussedProfile)
        expect(loudFilter.received).toBe(true)
        expect(loudFilter.effectiveQualityBps).toBe(5000) // 2500 * 2
    })

    it('commits BeliefRecord with DIRECT_OBSERVATION and attaches receipt hash on successful sensory transmission', () => {
        const clearOptical: PerceptCandidate = {
            ...validReceipt,
            channel: 'OPTICAL',
            sourceCell: 100,
            observerCell: 101,
            signalCdB: 9000,
            ambientNoiseCdB: 2000,
            snrMarginCdB: 7000,
            bearingDegrees: 0,
            isOccluded: false,
        }

        const healthyProfile: SomaticSensoryProfile = {
            actorId: 'char_bog',
            visualAcuity: 'NORMAL',
            facingSector: 0,
            hasConcussiveDeafness: false,
            hearingThresholdCdB: 2000,
        }

        const filter = evaluateSensoryFilter(clearOptical, healthyProfile)
        expect(filter.received).toBe(true)

        const belief = deriveBeliefFromPercept(
            'char_bog',
            'evt_duel_042',
            'fact_siphon_stolen',
            'char_spleen',
            'stole',
            'item_siphon',
            clearOptical,
            filter,
        )

        expect(belief).toBeDefined()
        expect(belief?.holder_id).toBe('char_bog')
        expect(belief?.source_type).toBe('DIRECT_OBSERVATION')
        expect(belief?.hop_count).toBe(0)
        expect(belief?.subjective_confidence_bp).toBe(10000) // Clamped at 10000
        expect(belief?.receipt_hash).toBe(validReceipt.receiptHash)
        expect(belief?.resists_correction).toBe(true)
    })

    it('combines multi-source evidence using correlation-aware noisy-OR in basis points', () => {
        // p1 = 6000 bps (60%), p2 = 5000 bps (50%)
        // remaining doubt: (4000 * 5000) / 10000 = 2000
        // combined confidence: 10000 - 2000 = 8000 bps (80%)
        const combined = combineBeliefConfidencesNoisyOr(6000, 5000)
        expect(combined).toBe(8000)

        // Assert Gillian integer purity (reject floats)
        expect(() => combineBeliefConfidencesNoisyOr(0.6 as any, 5000)).toThrow(
            'GILLIAN_INTEGER_BREACH',
        )
    })
})
