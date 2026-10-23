import * as Act from './database.action'
import { DatabaseModel } from './database.model'
import * as Buzz from './database.buzzer'
import type State from '../99.core/state'

export function reducer(
    model: DatabaseModel = new DatabaseModel(),
    act: Act.Actions,
    state?: State,
) {
    switch (act.type) {
        case Act.INIT_DATABASE:
            return Buzz.initDatabase(model, act.bale, state as State)

        case Act.UPDATE_DATABASE:
            return Buzz.updateDatabase(model, act.bale, state as State)

        case Act.ENSURE_SCHEMA_DATABASE:
            return Buzz.ensureSchemaDatabase(model, act.bale, state as State)

        case Act.EXEC_DATABASE:
            return Buzz.execDatabase(model, act.bale, state as State)

        case Act.QUERY_DATABASE:
            return Buzz.queryDatabase(model, act.bale, state as State)

        case Act.EXEC_BATCH_DATABASE:
            return Buzz.execBatchDatabase(model, act.bale, state as State)

        case Act.CHECK_INTEGRITY_DATABASE:
            return Buzz.checkIntegrityDatabase(model, act.bale, state as State)

        case Act.CLOSE_DATABASE:
            return Buzz.closeDatabase(model, act.bale, state as State)

        default:
            return model
    }
}
