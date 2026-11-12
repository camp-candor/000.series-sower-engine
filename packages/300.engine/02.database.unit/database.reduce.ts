/**
 * 02.database.unit - Database Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './database.action.js'
import { DatabaseModel } from './database.model.js'
import * as Buzz from './database.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: DatabaseModel = new DatabaseModel(),
    act: Act.Actions,
    state?: State,
): DatabaseModel | Promise<DatabaseModel> {
    switch (act.type) {
        case Act.INIT_DATABASE:
            return Buzz.initDatabase(clone(model), act.bale, state)

        case Act.UPDATE_DATABASE:
            return Buzz.updateDatabase(clone(model), act.bale, state)

        case Act.ENSURE_SCHEMA_DATABASE:
            return Buzz.ensureSchemaDatabase(clone(model), act.bale, state)

        case Act.QUERY_DATABASE:
            return Buzz.queryDatabase(clone(model), act.bale as any, state)

        case Act.EXEC_BATCH_DATABASE:
        case Act.EXEC_DATABASE:
            return Buzz.execBatchDatabase(clone(model), act.bale as any, state)

        case Act.CHECK_INTEGRITY_DATABASE:
            return Buzz.checkIntegrityDatabase(clone(model), act.bale, state)

        case Act.RESET_LOCAL_DATABASE:
            return Buzz.resetLocalDatabase(clone(model), act.bale, state)

        case Act.INSERT_FACT:
            return Buzz.insertFact(clone(model), act.bale as any, state)

        case Act.UPDATE_FACT_CLAIM:
            return Buzz.updateFactClaim(clone(model), act.bale as any, state)

        case Act.SET_FACT_STANDING:
            return Buzz.setFactStanding(clone(model), act.bale as any, state)

        case Act.REGISTER_SCENE:
            return Buzz.registerScene(clone(model), act.bale as any, state)

        case Act.ADD_SCENE_DEPENDENCY:
            return Buzz.addSceneDependency(clone(model), act.bale as any, state)

        case Act.QUERY_WHY_DIRTY:
            return Buzz.queryWhyDirty(clone(model), act.bale as any, state)

        case Act.GET_CENTRALITY_TELEMETRY:
            return Buzz.getFactCentralityTelemetry(
                clone(model),
                act.bale,
                state,
            )

        case Act.MOUNT_REALM_DATABASE:
            return Buzz.mountRealmDatabase(clone(model), act.bale as any, state)

        case Act.CLOSE_DATABASE: {
            const cpy = clone(model)
            Buzz.closeDatabaseConnection(cpy)
            return cpy
        }

        case Act.ENSURE_SCHEMA:
            return Buzz.ensureSchema(clone(model), act.bale, state)

        case Act.MIGRATE_SPATIAL_PROOF_SCHEMA:
            return Buzz.migrateSpatialProofSchemaAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.APPEND_EVENT_LOG_WITH_PROOF:
            return Buzz.appendEventLogWithProof(
                clone(model),
                act.bale as any,
                state,
            )

        default:
            return model
    }
}
