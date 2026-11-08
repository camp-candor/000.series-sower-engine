/**
 * 06.grievance.unit - Grievance Action Definitions
 */
import type { Action } from '../99.core/interface/action.interface.js'
import type GrievanceBit from './fce/grievance.bit.js'

export const INIT_GRIEVANCE = '[Grievance action] Init Grievance'
export class InitGrievance implements Action {
    readonly type = INIT_GRIEVANCE
    constructor(public bale?: GrievanceBit) {}
}

export const UPDATE_GRIEVANCE = '[Grievance action] Update Grievance'
export class UpdateGrievance implements Action {
    readonly type = UPDATE_GRIEVANCE
    constructor(public bale?: GrievanceBit) {}
}

export const UPSERT_GRIEVANCE = '[Grievance action] Upsert Grievance'
export class UpsertGrievance implements Action {
    readonly type = UPSERT_GRIEVANCE
    constructor(public bale?: GrievanceBit) {}
}

export const ESCALATE_GRIEVANCE = '[Grievance action] Escalate Grievance'
export class EscalateGrievance implements Action {
    readonly type = ESCALATE_GRIEVANCE
    constructor(public bale?: GrievanceBit) {}
}

export const TICK_COOLDOWN_GRIEVANCE =
    '[Grievance action] Tick Cooldown Grievance'
export class TickCooldownGrievance implements Action {
    readonly type = TICK_COOLDOWN_GRIEVANCE
    constructor(public bale?: GrievanceBit) {}
}

export const QUERY_ELIGIBLE_GRIEVANCES =
    '[Grievance action] Query Eligible Grievances'
export class QueryEligibleGrievances implements Action {
    readonly type = QUERY_ELIGIBLE_GRIEVANCES
    constructor(public bale?: GrievanceBit) {}
}

export const SELECT_STAGE3_ENCOUNTER =
    '[Grievance action] Select Stage3 Encounter'
export class SelectStage3Encounter implements Action {
    readonly type = SELECT_STAGE3_ENCOUNTER
    constructor(public bale?: GrievanceBit) {}
}

export const AUDIT_GRIEVANCE_RECORDS =
    '[Grievance action] Audit Grievance Records'
export class AuditGrievanceRecords implements Action {
    readonly type = AUDIT_GRIEVANCE_RECORDS
    constructor(public bale?: GrievanceBit) {}
}

export type Actions =
    | InitGrievance
    | UpdateGrievance
    | UpsertGrievance
    | EscalateGrievance
    | TickCooldownGrievance
    | QueryEligibleGrievances
    | SelectStage3Encounter
    | AuditGrievanceRecords
