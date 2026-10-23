import type { Action } from '../99.core/interface/action.interface'
import type GrievanceBit from './fce/grievance.bit'

export const INIT_GRIEVANCE = '[Grievance action] Init Grievance'
export class InitGrievance implements Action<GrievanceBit> {
    readonly type = INIT_GRIEVANCE
    constructor(public bale: GrievanceBit) {}
}

export const UPDATE_GRIEVANCE = '[Grievance action] Update Grievance'
export class UpdateGrievance implements Action<GrievanceBit> {
    readonly type = UPDATE_GRIEVANCE
    constructor(public bale: GrievanceBit) {}
}

export const UPSERT_GRIEVANCE = '[Grievance action] Upsert Grievance'
export class UpsertGrievance implements Action<GrievanceBit> {
    readonly type = UPSERT_GRIEVANCE
    constructor(public bale: GrievanceBit) {}
}

export const ESCALATE_GRIEVANCE = '[Grievance action] Escalate Grievance'
export class EscalateGrievance implements Action<GrievanceBit> {
    readonly type = ESCALATE_GRIEVANCE
    constructor(public bale: GrievanceBit) {}
}

export const TICK_COOLDOWN_GRIEVANCE =
    '[Grievance action] Tick Cooldown Grievance'
export class TickCooldownGrievance implements Action<GrievanceBit> {
    readonly type = TICK_COOLDOWN_GRIEVANCE
    constructor(public bale: GrievanceBit) {}
}

export const RESOLVE_GRIEVANCE = '[Grievance action] Resolve Grievance'
export class ResolveGrievance implements Action<GrievanceBit> {
    readonly type = RESOLVE_GRIEVANCE
    constructor(public bale: GrievanceBit) {}
}

export const QUERY_ELIGIBLE_GRIEVANCES =
    '[Grievance action] Query Eligible Grievances'
export class QueryEligibleGrievances implements Action<GrievanceBit> {
    readonly type = QUERY_ELIGIBLE_GRIEVANCES
    constructor(public bale: GrievanceBit) {}
}

export type Actions =
    | InitGrievance
    | UpdateGrievance
    | UpsertGrievance
    | EscalateGrievance
    | TickCooldownGrievance
    | ResolveGrievance
    | QueryEligibleGrievances
