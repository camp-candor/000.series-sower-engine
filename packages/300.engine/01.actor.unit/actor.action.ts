import type { Action } from '../99.core/interface/action.interface'
import type ActorBit from './fce/actor.bit'

export const INIT_ACTOR = '[Actor action] Init Actor'
export class InitActor implements Action<ActorBit> {
    readonly type = INIT_ACTOR
    constructor(public bale: ActorBit) {}
}

export const UPDATE_ACTOR = '[Actor action] Update Actor'
export class UpdateActor implements Action<ActorBit> {
    readonly type = UPDATE_ACTOR
    constructor(public bale: ActorBit) {}
}

export const RECORD_BELIEF_ACTOR = '[Actor action] Record Belief Actor'
export class RecordBeliefActor implements Action<ActorBit> {
    readonly type = RECORD_BELIEF_ACTOR
    constructor(public bale: ActorBit) {}
}

export const QUERY_HORIZON_ACTOR = '[Actor action] Query Horizon Actor'
export class QueryHorizonActor implements Action<ActorBit> {
    readonly type = QUERY_HORIZON_ACTOR
    constructor(public bale: ActorBit) {}
}

export const SCRUB_EPISTEMIC_CONTEXT_ACTOR =
    '[Actor action] Scrub Epistemic Context Actor'
export class ScrubEpistemicContextActor implements Action<ActorBit> {
    readonly type = SCRUB_EPISTEMIC_CONTEXT_ACTOR
    constructor(public bale: ActorBit) {}
}

export const STAGE_DETAIL_ACTOR = '[Actor action] Stage Detail Actor'
export class StageDetailActor implements Action<ActorBit> {
    readonly type = STAGE_DETAIL_ACTOR
    constructor(public bale: ActorBit) {}
}

export const RATIFY_DETAIL_ACTOR = '[Actor action] Ratify Detail Actor'
export class RatifyDetailActor implements Action<ActorBit> {
    readonly type = RATIFY_DETAIL_ACTOR
    constructor(public bale: ActorBit) {}
}

export const DISCARD_DETAIL_ACTOR = '[Actor action] Discard Detail Actor'
export class DiscardDetailActor implements Action<ActorBit> {
    readonly type = DISCARD_DETAIL_ACTOR
    constructor(public bale: ActorBit) {}
}

export const LIST_UNRATIFIED_DETAILS_ACTOR =
    '[Actor action] List Unratified Details Actor'
export class ListUnratifiedDetailsActor implements Action<ActorBit> {
    readonly type = LIST_UNRATIFIED_DETAILS_ACTOR
    constructor(public bale: ActorBit) {}
}

export type Actions =
    | InitActor
    | UpdateActor
    | RecordBeliefActor
    | QueryHorizonActor
    | ScrubEpistemicContextActor
    | StageDetailActor
    | RatifyDetailActor
    | DiscardDetailActor
    | ListUnratifiedDetailsActor
