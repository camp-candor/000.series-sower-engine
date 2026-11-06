/**
 * 02.database.unit - Database Buzz Business Logic
 * Pure zero-IO in-memory table operations, immutability guards, and integrity checks.
 */
import { DatabaseModel } from '../database.model.js'
import type DatabaseBit from '../fce/database.bit.js'
import type {
    DatabaseTableName,
    DatabaseOperation,
} from '../fce/database.bit.js'
import type {
    TableStatusReport,
    DatabaseStateReport,
    EventLogRecord,
    StringsLedgerRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    EntityLiveRecord,
    ActorBeliefRecord,
    UnratifiedDetailRecord,
} from '../fce/database.interface.js'
import type State from '../../99.core/state.js'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

function assertBasisPoints(val: number, field: string): void {
    if (!Number.isInteger(val)) {
        throw new TypeError(
            `[FLOAT_PROHIBITED] ${field} must be a discrete integer. Received: ${val}`,
        )
    }
    if (val < 0 || val > 10000) {
        throw new RangeError(
            `[OUT_OF_BOUNDS] ${field} out of bounds [0, 10000]: ${val}`,
        )
    }
}

export const initDatabase = (
    cpy: DatabaseModel,
    bal?: DatabaseBit,
    _ste?: State,
): DatabaseModel => {
    if (bal?.slv) {
        bal.slv({
            databaseBit: {
                idx: 'init-database',
                val: 1,
            },
        })
    }
    return cpy
}

export const updateDatabase = (
    cpy: DatabaseModel,
    bal?: DatabaseBit,
    _ste?: State,
): DatabaseModel => {
    if (bal?.slv) {
        bal.slv({
            databaseBit: {
                idx: 'update-database',
                val: 1,
            },
        })
    }
    return cpy
}

export const ensureSchemaDatabase = async (
    cpy: DatabaseModel,
    bal?: DatabaseBit,
    ste?: State,
): Promise<DatabaseModel> => {
    cpy.isInitialized = true

    await emitConsole(
        ste,
        '>> [DATABASE:SCHEMA] Four-Vector in-memory tables bootstrapped.',
    )
    await emitConsole(
        ste,
        '>> [DATABASE:SCHEMA] Hard triggers active: event_log (IMMUTABILITY_VIOLATION).',
    )

    if (bal?.slv) {
        bal.slv({
            databaseBit: {
                idx: 'ensure-schema-pass',
                val: 7, // 7 tables active
                src: 'IN_MEMORY_STORAGE_ONLINE',
            },
        })
    }

    return cpy
}

export const resetLocalDatabase = async (
    cpy: DatabaseModel,
    bal?: DatabaseBit,
    ste?: State,
): Promise<DatabaseModel> => {
    for (const key of Object.keys(cpy.tables) as DatabaseTableName[]) {
        cpy.tables[key].clear()
    }
    cpy.isInitialized = true

    await emitConsole(
        ste,
        '>> [DATABASE:RESET] All 7 Four-Vector memory tables cleared.',
    )

    if (bal?.slv) {
        bal.slv({
            databaseBit: {
                idx: 'reset-database-pass',
                val: 0,
            },
        })
    }

    return cpy
}

export const queryDatabase = async (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    _ste?: State,
): Promise<DatabaseModel> => {
    const table = bal.dat?.table
    const key = bal.dat?.key

    if (!table || !cpy.tables[table]) {
        if (bal.slv) {
            bal.slv({
                databaseBit: {
                    idx: 'query-database-fail',
                    val: 0,
                    dat: {
                        error: `[TABLE_NOT_FOUND] Table '${table}' does not exist`,
                    },
                },
            })
        }
        return cpy
    }

    const tableMap = cpy.tables[table]

    if (key !== undefined) {
        const record = tableMap.get(key)
        if (bal.slv) {
            bal.slv({
                databaseBit: {
                    idx: 'query-database-pass',
                    val: record ? 1 : 0,
                    dat: { record },
                },
            })
        }
        return cpy
    }

    const records = Array.from(tableMap.values() as Iterable<any>)
    if (bal.slv) {
        bal.slv({
            databaseBit: {
                idx: 'query-database-pass',
                val: records.length,
                dat: { records, rowCount: records.length },
            },
        })
    }

    return cpy
}

export const execBatchDatabase = async (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    ste?: State,
): Promise<DatabaseModel> => {
    const operations: readonly DatabaseOperation[] = bal.dat?.operations ?? []
    let appliedCount = 0

    try {
        for (const op of operations) {
            const tableMap = cpy.tables[op.table]
            if (!tableMap) {
                throw new Error(
                    `[INVALID_TABLE] Target table '${op.table}' is not recognized`,
                )
            }

            // Invariant 1: event_log Immutability Trigger
            if (op.table === 'event_log' && op.action !== 'INSERT') {
                throw new Error(
                    `IMMUTABILITY_VIOLATION: Updates or deletions are strictly prohibited on event_log`,
                )
            }

            // Invariant 2: event_log state_hash format
            if (op.table === 'event_log' && op.record) {
                const rec = op.record as EventLogRecord
                if (!rec.state_hash || rec.state_hash.length !== 64) {
                    throw new Error(
                        `[INVALID_STATE_HASH] event_log state_hash must be a 64-character hash`,
                    )
                }
            }

            // Invariant 3: strings_ledger Anti-Reflexivity & Basis Points
            if (op.table === 'strings_ledger' && op.record) {
                const rec = op.record as StringsLedgerRecord
                if (rec.holder_id === rec.debtor_id) {
                    throw new Error(
                        `[ANTI_REFLEXIVITY_BREACH] Leverage holder cannot be identical to debtor: ${rec.holder_id}`,
                    )
                }
                assertBasisPoints(rec.weight_bps, 'strings_ledger.weight_bps')
            }

            // Invariant 4: grievance_status Anti-Reflexivity & Basis Points
            if (op.table === 'grievance_status' && op.record) {
                const rec = op.record as GrievanceStatusRecord
                if (rec.instigator_id === rec.victim_id) {
                    throw new Error(
                        `[SELF_GRIEVANCE_BREACH] Grievance instigator cannot be identical to victim: ${rec.instigator_id}`,
                    )
                }
                assertBasisPoints(
                    rec.intensity_bps,
                    'grievance_status.intensity_bps',
                )
            }

            // Invariant 5: paranoia_clocks Basis Points
            if (op.table === 'paranoia_clocks' && op.record) {
                const rec = op.record as ParanoiaClockRecord
                assertBasisPoints(rec.value_bps, 'paranoia_clocks.value_bps')
                assertBasisPoints(
                    rec.threshold_bps,
                    'paranoia_clocks.threshold_bps',
                )
                assertBasisPoints(
                    rec.decay_rate_bps,
                    'paranoia_clocks.decay_rate_bps',
                )
            }

            // Invariant 6: entities_live Basis Points
            if (op.table === 'entities_live' && op.record) {
                const rec = op.record as EntityLiveRecord
                assertBasisPoints(rec.fatigue_bps, 'entities_live.fatigue_bps')
                assertBasisPoints(rec.pain_bps, 'entities_live.pain_bps')
                assertBasisPoints(
                    rec.refusal_strain_bps,
                    'entities_live.refusal_strain_bps',
                )
            }

            // Invariant 7: actor_beliefs Basis Points
            if (op.table === 'actor_beliefs' && op.record) {
                const rec = op.record as ActorBeliefRecord
                assertBasisPoints(
                    rec.subjective_probability_bps,
                    'actor_beliefs.subjective_probability_bps',
                )
            }

            // Invariant 8: unratified_details Basis Points
            if (op.table === 'unratified_details' && op.record) {
                const rec = op.record as UnratifiedDetailRecord
                assertBasisPoints(
                    rec.salience_bps,
                    'unratified_details.salience_bps',
                )
            }

            // Execution
            if (op.action === 'INSERT' || op.action === 'UPSERT') {
                if (!op.record) {
                    throw new Error(
                        `[MISSING_RECORD] Operation requires a record payload`,
                    )
                }
                tableMap.set(op.key, op.record as any)
                appliedCount++
            } else if (op.action === 'UPDATE') {
                if (!tableMap.has(op.key)) {
                    throw new Error(
                        `[RECORD_NOT_FOUND] Cannot update non-existent key: ${op.key}`,
                    )
                }
                tableMap.set(op.key, op.record as any)
                appliedCount++
            } else if (op.action === 'DELETE') {
                tableMap.delete(op.key)
                appliedCount++
            }
        }

        if (bal.slv) {
            bal.slv({
                databaseBit: {
                    idx: 'exec-batch-pass',
                    val: appliedCount,
                    dat: { rowCount: appliedCount },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [DATABASE:BATCH_FAIL] ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                databaseBit: {
                    idx: 'exec-batch-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }

    return cpy
}

export const checkIntegrityDatabase = async (
    cpy: DatabaseModel,
    bal?: DatabaseBit,
    ste?: State,
): Promise<DatabaseModel> => {
    const tableKeys = Object.keys(cpy.tables) as DatabaseTableName[]
    const reports: TableStatusReport[] = []
    let totalRows = 0

    for (const tableName of tableKeys) {
        const count = cpy.tables[tableName].size
        totalRows += count
        reports.push({
            tableName,
            rowCount: count,
            status: count > 0 ? 'OK' : 'EMPTY',
        })
    }

    const stateReport: DatabaseStateReport = {
        initialized: cpy.isInitialized,
        tables: reports,
        totalRows,
        timestamp_ms: Date.now(),
    }

    await emitConsole(
        ste,
        '>> ------------------------------------------------------------',
    )
    await emitConsole(
        ste,
        '>> [DATABASE:STATUS] 7 Four-Vector Tables Active (Zero I/O)',
    )
    for (const r of reports) {
        const padName = r.tableName.padEnd(20)
        await emitConsole(
            ste,
            `>>  * ${padName} : ${r.rowCount} rows [${r.status}]`,
        )
    }
    await emitConsole(
        ste,
        '>> ------------------------------------------------------------',
    )

    if (bal?.slv) {
        bal.slv({
            databaseBit: {
                idx: 'check-integrity-pass',
                val: totalRows,
                dat: { reports, stateReport },
            },
        })
    }

    return cpy
}
