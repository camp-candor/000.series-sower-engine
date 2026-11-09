/**
 * 01.actor.unit - Actor Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type ActorBit from './fce/actor.bit.js'

export const INIT_ACTOR = '[Actor action] Init Actor'
export class InitActor implements Action {
    readonly type = INIT_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const UPDATE_ACTOR = '[Actor action] Update Actor'
export class UpdateActor implements Action {
    readonly type = UPDATE_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const RECORD_BELIEF_ACTOR = '[Actor action] Record Belief Actor'
export class RecordBeliefActor implements Action {
    readonly type = RECORD_BELIEF_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const QUERY_HORIZON_ACTOR = '[Actor action] Query Horizon Actor'
export class QueryHorizonActor implements Action {
    readonly type = QUERY_HORIZON_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const SCRUB_EPISTEMIC_CONTEXT_ACTOR =
    '[Actor action] Scrub Epistemic Context Actor'
export class ScrubEpistemicContextActor implements Action {
    readonly type = SCRUB_EPISTEMIC_CONTEXT_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const CALCULATE_SALIENCE_ACTOR =
    '[Actor action] Calculate Salience Actor'
export class CalculateSalienceActor implements Action {
    readonly type = CALCULATE_SALIENCE_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const STAGE_DETAIL_ACTOR = '[Actor action] Stage Detail Actor'
export class StageDetailActor implements Action {
    readonly type = STAGE_DETAIL_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const RATIFY_DETAIL_ACTOR = '[Actor action] Ratify Detail Actor'
export class RatifyDetailActor implements Action {
    readonly type = RATIFY_DETAIL_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const DISCARD_DETAIL_ACTOR = '[Actor action] Discard Detail Actor'
export class DiscardDetailActor implements Action {
    readonly type = DISCARD_DETAIL_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const LIST_UNRATIFIED_DETAILS_ACTOR =
    '[Actor action] List Unratified Details Actor'
export class ListUnratifiedDetailsActor implements Action {
    readonly type = LIST_UNRATIFIED_DETAILS_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const BUILD_SUBTEXT_DIRECTIVE_ACTOR =
    '[Actor action] Build Subtext Directive Actor'
export class BuildSubtextDirectiveActor implements Action {
    readonly type = BUILD_SUBTEXT_DIRECTIVE_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const PROBE_DIALOGUE_LEAK_ACTOR =
    '[Actor action] Probe Dialogue Leak Actor'
export class ProbeDialogueLeakActor implements Action {
    readonly type = PROBE_DIALOGUE_LEAK_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const COMPILE_DIALOGUE_BEAT_ACTOR =
    '[Actor action] Compile Dialogue Beat Actor'
export class CompileDialogueBeatActor implements Action {
    readonly type = COMPILE_DIALOGUE_BEAT_ACTOR
    constructor(public bale?: ActorBit) {}
}

export const ENFORCE_CURTNESS_BUDGET_ACTOR =
    '[Actor action] Enforce Curtness Budget Actor'
export class EnforceCurtnessBudgetActor implements Action {
    readonly type = ENFORCE_CURTNESS_BUDGET_ACTOR
    constructor(public bale?: ActorBit) {}
}

export type Actions =
    | InitActor
    | UpdateActor
    | RecordBeliefActor
    | QueryHorizonActor
    | ScrubEpistemicContextActor
    | CalculateSalienceActor
    | StageDetailActor
    | RatifyDetailActor
    | DiscardDetailActor
    | ListUnratifiedDetailsActor
    | BuildSubtextDirectiveActor
    | ProbeDialogueLeakActor
    | CompileDialogueBeatActor
    | EnforceCurtnessBudgetActor
