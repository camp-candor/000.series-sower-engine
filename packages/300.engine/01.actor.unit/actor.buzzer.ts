/**
 * 01.actor.unit - Actor Buzzer Barrel Export
 */
export {
    initActor,
    updateActor,
    recordBeliefActor,
    queryHorizonActor,
    scrubEpistemicContextActor,
    buildSubtextDirectiveAction,
    probeDialogueLeakAction,
    calculateSalienceActor,
    stageDetailActor,
    ratifyDetailActor,
    discardDetailActor,
    listUnratifiedDetailsActor,
    assertBasisPoints,
    makeBeliefId,
    calculateCompositeSalience,
    buildSubtextAttenuationDirective,
    probeDialogueSubtextLeak,
} from './buz/actor.buzz.js'
export type {
    BeliefSourceType,
    ActorBeliefRecord,
    DetailStatus,
    DetailCategory,
    DramaticTurnLevel,
    UnratifiedDetailRecord,
    CalculateSalienceParams,
    SalienceCalculationReceipt,
    RecordBeliefParams,
    ScrubContextParams,
    StageDetailParams,
    RatifyDetailParams,
    DiscardDetailParams,
    SubtextAttenuationDirective,
    BuildSubtextParams,
    DialogueLeakProbeParams,
    DialogueLeakProbeReceipt,
} from './fce/actor.interface.js'
export type {
    ActorPayload,
} from './fce/actor.bit.js'
