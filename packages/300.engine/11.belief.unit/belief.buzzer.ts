/**
 * 11.belief.unit - Belief Buzzer Barrel Re-Exports
 */
export {
    initBelief,
    updateBelief,
    processPerceptCandidateAction,
    evaluateSensoryGateAction,
    combineBeliefsAction,
} from './buz/belief.buzz.js'

export { parsePerceptCandidate } from './buz/percept-ingest.buzz.js'
export {
    evaluateSensoryFilter,
    CONCUSSION_ACOUSTIC_ELEVATION_CDB,
} from './buz/sensory-filter.buzz.js'
export {
    deriveBeliefFromPercept,
    combineBeliefConfidencesNoisyOr,
} from './buz/belief-commit.buzz.js'

export type {
    SensoryChannel,
    VisualAcuity,
    SpatialReceiptMetadata,
    PerceptCandidate,
    SomaticSensoryProfile,
    SensoryFilterEvaluation,
} from './fce/percept.interface.js'

export type {
    EpistemicHorizon,
    BeliefSourceType,
    BeliefRecord,
    BeliefModelDescriptor,
} from './fce/belief.interface.js'

export type { BeliefPayload } from './fce/belief.bit.js'
