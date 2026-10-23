import clone from 'clone-deep'
import * as Act from './grievance.action'
import { GrievanceModel } from './grievance.model'
import * as Buzz from './grievance.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: GrievanceModel = new GrievanceModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_GRIEVANCE:
            return Buzz.initGrievance(clone(model, true), act.bale, state!)

        case Act.UPDATE_GRIEVANCE:
            return Buzz.updateGrievance(clone(model, true), act.bale, state!)

        case Act.UPSERT_GRIEVANCE:
            return Buzz.upsertGrievance(clone(model, true), act.bale, state!)

        case Act.ESCALATE_GRIEVANCE:
            return Buzz.escalateGrievance(clone(model, true), act.bale, state!)

        case Act.TICK_COOLDOWN_GRIEVANCE:
            return Buzz.tickCooldownGrievance(
                clone(model, true),
                act.bale,
                state!,
            )

        case Act.RESOLVE_GRIEVANCE:
            return Buzz.resolveGrievance(clone(model, true), act.bale, state!)

        case Act.QUERY_ELIGIBLE_GRIEVANCES:
            return Buzz.queryEligibleGrievances(
                clone(model, true),
                act.bale,
                state!,
            )

        default:
            return model
    }
}
