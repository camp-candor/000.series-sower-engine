/**
 * 06.grievance.unit - Grievance Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './grievance.action.js'
import { GrievanceModel } from './grievance.model.js'
import * as Buzz from './grievance.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: GrievanceModel = new GrievanceModel(),
    act: Act.Actions,
    state?: State,
): GrievanceModel | Promise<GrievanceModel> {
    switch (act.type) {
        case Act.INIT_GRIEVANCE:
            return Buzz.initGrievance(clone(model), act.bale, state)

        case Act.UPDATE_GRIEVANCE:
            return Buzz.updateGrievance(clone(model), act.bale, state)

        case Act.UPSERT_GRIEVANCE:
            return Buzz.upsertGrievanceAction(clone(model), act.bale as any, state)

        case Act.ESCALATE_GRIEVANCE:
            return Buzz.escalateGrievanceAction(clone(model), act.bale as any, state)

        case Act.TICK_COOLDOWN_GRIEVANCE:
            return Buzz.tickCooldownGrievanceAction(clone(model), act.bale as any, state)

        case Act.QUERY_ELIGIBLE_GRIEVANCES:
            return Buzz.queryEligibleGrievancesAction(clone(model), act.bale as any, state)

        case Act.SELECT_STAGE3_ENCOUNTER:
            return Buzz.selectStage3EncounterAction(clone(model), act.bale as any, state)

        case Act.AUDIT_GRIEVANCE_RECORDS:
            return Buzz.auditGrievanceRecordsAction(clone(model), act.bale as any, state)

        default:
            return model
    }
}
