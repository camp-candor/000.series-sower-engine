import type { DatabaseModel } from '../database.model'
import type DatabaseBit from '../fce/database.bit'
import type State from '../../99.core/state'
import type {
    ILocalDatabasePort,
    IPreparedStatement,
} from '../fce/database.interface'
import path from 'path'
import fs from 'fs-extra'
import { createRequire } from 'module'

const req =
    typeof require !== 'undefined'
        ? require
        : createRequire(path.resolve(process.cwd(), 'index.js'))

/**
 * Dialect-Pure SQLite Data Definition Language (DDL)
 * 7 Tables + 2 Append-Only Triggers + Dedicated Indices
 */
export const LOCAL_FOUR_VECTOR_DDL = `
-- 1. AUTHORITATIVE APPEND-ONLY EVENT LOG
CREATE TABLE IF NOT EXISTS event_log (
  sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  stream_id TEXT NOT NULL,
  tick INTEGER NOT NULL DEFAULT 0 CHECK(tick >= 0),
  event_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  actor_id TEXT,
  target_id TEXT,
  seed TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  topology_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  overlay_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  query_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  receipt_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  prev_event_hash TEXT NOT NULL CHECK(length(prev_event_hash) = 64),
  state_hash TEXT NOT NULL CHECK(length(state_hash) = 64),
  timestamp_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_stream_seq ON event_log(stream_id, sequence_id);
CREATE INDEX IF NOT EXISTS idx_event_tick ON event_log(tick);

-- APPEND-ONLY IMMUTABILITY TRIGGERS
CREATE TRIGGER IF NOT EXISTS trg_event_log_no_update
BEFORE UPDATE ON event_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'IMMUTABILITY_VIOLATION: event_log is strictly append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_event_log_no_delete
BEFORE DELETE ON event_log
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'IMMUTABILITY_VIOLATION: event_log is strictly append-only');
END;

-- 2. MATERIALIZED WORKING STATE: SOMATIC, SPATIAL & LOGISTICAL VECTORS
CREATE TABLE IF NOT EXISTS entities_live (
  entity_id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  coord_q INTEGER NOT NULL DEFAULT 0,
  coord_r INTEGER NOT NULL DEFAULT 0,
  arms_available INTEGER NOT NULL CHECK (arms_available BETWEEN 0 AND 2),
  legs_available INTEGER NOT NULL CHECK (legs_available BETWEEN 0 AND 2) DEFAULT 2,
  locomotion_tier TEXT NOT NULL CHECK (locomotion_tier IN ('UNRESTRICTED', 'LIMPING', 'IMMOBILIZED')) DEFAULT 'UNRESTRICTED',
  concussion_level INTEGER NOT NULL CHECK (concussion_level BETWEEN 0 AND 3) DEFAULT 0,
  fatigue_bps INTEGER NOT NULL CHECK (fatigue_bps BETWEEN 0 AND 10000) DEFAULT 0,
  pain_bps INTEGER NOT NULL CHECK (pain_bps BETWEEN 0 AND 10000) DEFAULT 0,
  refusal_strain_bps INTEGER NOT NULL CHECK (refusal_strain_bps BETWEEN 0 AND 10000) DEFAULT 0,
  open_wounds_json TEXT NOT NULL DEFAULT '[]',
  banned_kinetic_verbs_json TEXT NOT NULL DEFAULT '[]',
  held_items_json TEXT NOT NULL DEFAULT '[]',
  worn_gear_json TEXT NOT NULL DEFAULT '{}',
  slung_items_json TEXT NOT NULL DEFAULT '[]',
  cached_items_json TEXT NOT NULL DEFAULT '[]',
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_location ON entities_live(location_id);
CREATE INDEX IF NOT EXISTS idx_entities_coords ON entities_live(coord_q, coord_r);

-- 3. MATERIALIZED WORKING STATE: RELATIONAL LEVERAGE STRINGS
CREATE TABLE IF NOT EXISTS strings_ledger (
  relation_id TEXT PRIMARY KEY,
  holder_id TEXT NOT NULL,
  debtor_id TEXT NOT NULL,
  weight_bps INTEGER NOT NULL CHECK (weight_bps BETWEEN 0 AND 10000),
  strings_count INTEGER NOT NULL DEFAULT 1 CHECK (strings_count >= 0),
  updated_at_ms INTEGER NOT NULL,
  CONSTRAINT chk_anti_reflexive CHECK (holder_id != debtor_id),
  UNIQUE(holder_id, debtor_id)
);

CREATE INDEX IF NOT EXISTS idx_strings_debtor ON strings_ledger(debtor_id);

-- 4. MATERIALIZED WORKING STATE: GRIEVANCE ESCALATION TRACKING
CREATE TABLE IF NOT EXISTS grievance_status (
  grievance_id TEXT PRIMARY KEY,
  instigator_id TEXT NOT NULL,
  victim_id TEXT NOT NULL,
  escalation_depth INTEGER NOT NULL DEFAULT 0 CHECK (escalation_depth >= 0),
  cooldown_cycles INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_cycles >= 0),
  intensity_bps INTEGER NOT NULL DEFAULT 0 CHECK (intensity_bps BETWEEN 0 AND 10000),
  status TEXT NOT NULL CHECK (status IN ('DORMANT', 'ACTIVE', 'SIMMERING', 'RESOLVED')) DEFAULT 'DORMANT',
  updated_at_ms INTEGER NOT NULL,
  CONSTRAINT chk_anti_reflexive_grievance CHECK (instigator_id != victim_id)
);

CREATE INDEX IF NOT EXISTS idx_grievance_status ON grievance_status(status, cooldown_cycles);

-- 5. MATERIALIZED WORKING STATE: UNIFIED PRESSURE METERS (PARANOIA CLOCKS)
CREATE TABLE IF NOT EXISTS paranoia_clocks (
  clock_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  clock_name TEXT NOT NULL,
  value_bps INTEGER NOT NULL CHECK (value_bps BETWEEN 0 AND 10000),
  threshold_bps INTEGER NOT NULL CHECK (threshold_bps BETWEEN 0 AND 10000),
  decay_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (decay_rate_bps BETWEEN 0 AND 10000),
  is_triggered INTEGER NOT NULL DEFAULT 0 CHECK (is_triggered IN (0, 1)),
  updated_at_ms INTEGER NOT NULL,
  UNIQUE(entity_id, clock_name)
);

CREATE INDEX IF NOT EXISTS idx_paranoia_clocks_entity ON paranoia_clocks(entity_id, is_triggered);

-- 6. MATERIALIZED WORKING STATE: EPISTEMIC VECTOR (ACTOR BELIEFS)
CREATE TABLE IF NOT EXISTS actor_beliefs (
  belief_id TEXT PRIMARY KEY,
  observer_id TEXT NOT NULL,
  fact_id TEXT NOT NULL,
  subjective_probability_bps INTEGER NOT NULL CHECK (subjective_probability_bps BETWEEN 0 AND 10000),
  source_type TEXT NOT NULL CHECK (source_type IN ('INFERENCE', 'TESTIMONY', 'DIRECT_OBSERVATION')),
  is_false_belief INTEGER NOT NULL DEFAULT 0 CHECK (is_false_belief IN (0, 1)),
  learned_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  UNIQUE(observer_id, fact_id)
);

CREATE INDEX IF NOT EXISTS idx_actor_beliefs_observer ON actor_beliefs(observer_id);

-- 7. INCIDENTAL DETAIL QUARANTINE (HARVEST QUEUE)
CREATE TABLE IF NOT EXISTS unratified_details (
  detail_id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  entity_id TEXT,
  salience_bps INTEGER NOT NULL CHECK (salience_bps BETWEEN 0 AND 10000),
  claim_proposal TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('STAGED', 'DISCARDED', 'RATIFIED')) DEFAULT 'STAGED',
  created_at_ms INTEGER NOT NULL,
  reviewed_at_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_unratified_details_scene ON unratified_details(scene_id, status);
`

/**
 * Creates a concrete ILocalDatabasePort wrapping better-sqlite3 or node:sqlite
 */
export function createLocalDatabasePort(dbPath: string): ILocalDatabasePort {
    let dbInstance: any = null

    try {
        const DatabaseConstructor = req('better-sqlite3')
        dbInstance = new DatabaseConstructor(dbPath)
    } catch (_err) {
        try {
            const { DatabaseSync } = req('node:sqlite')
            dbInstance = new DatabaseSync(dbPath)
        } catch (fallbackErr: any) {
            throw new Error(
                `[SQLITE_INIT_FAILED] Failed to initialize local SQLite driver: ${fallbackErr.message}`,
            )
        }
    }

    return {
        exec(sql: string): void {
            dbInstance.exec(sql)
        },
        prepare(sql: string): IPreparedStatement {
            const stmt = dbInstance.prepare(sql)
            return {
                run(...params: any[]) {
                    return stmt.run(...params)
                },
                get(...params: any[]) {
                    return stmt.get(...params)
                },
                all(...params: any[]) {
                    return stmt.all(...params)
                },
            }
        },
        transaction<T>(fn: () => T): () => T {
            if (typeof dbInstance.transaction === 'function') {
                return dbInstance.transaction(fn)
            }
            return () => {
                dbInstance.exec('BEGIN IMMEDIATE')
                try {
                    const res = fn()
                    dbInstance.exec('COMMIT')
                    return res
                } catch (txErr) {
                    dbInstance.exec('ROLLBACK')
                    throw txErr
                }
            }
        },
        pragma(pragmaStr: string): any {
            if (typeof dbInstance.pragma === 'function') {
                return dbInstance.pragma(pragmaStr)
            }
            return dbInstance.prepare(`PRAGMA ${pragmaStr}`).all()
        },
        close(): void {
            if (typeof dbInstance.close === 'function') {
                dbInstance.close()
            }
            dbInstance = null
        },
        isOpen(): boolean {
            return dbInstance !== null
        },
    }
}

export const emitConsole = async (
    _ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Non-blocking degradation
        }
    }
}

export const initDatabase = async (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    ste: State,
): Promise<DatabaseModel> => {
    const dbPath = bal?.src || bal?.dat?.dbPath || cpy.dbPath || ':memory:'

    try {
        if (dbPath !== ':memory:') {
            fs.ensureDirSync(path.dirname(path.resolve(dbPath)))
        }

        if (cpy.port && cpy.port.isOpen()) {
            cpy.port.close()
        }

        cpy.port = createLocalDatabasePort(dbPath)
        cpy.dbPath = dbPath
        if (ste?.value?.database) {
            ste.value.database.port = cpy.port
            ste.value.database.dbPath = cpy.dbPath
        }

        // PRAGMA Hardening
        cpy.port.pragma('foreign_keys = ON')
        if (dbPath !== ':memory:') {
            cpy.port.pragma('journal_mode = WAL')
            cpy.port.pragma('synchronous = NORMAL')
        }

        await emitConsole(
            ste,
            `>> [DATABASE:INIT] [OK] Local SQLite connected: ${dbPath}`,
        )

        // Auto-bootstrap schema idempotently
        return await ensureSchemaDatabase(cpy, bal, ste)
    } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        await emitConsole(ste, `:: [DATABASE:INIT] [FAIL] ${errorMsg}`)
        if (bal?.slv) {
            bal.slv({ err: errorMsg })
        }
        return cpy
    }
}

export const updateDatabase = async (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    ste: State,
): Promise<DatabaseModel> => {
    await emitConsole(
        ste,
        `>> [DATABASE:UPDATE] Syncing local SQLite state properties...`,
    )
    if (bal?.slv) {
        bal.slv({ dbBit: { idx: 'update-database' }, status: cpy.status })
    }
    return cpy
}

export const ensureSchemaDatabase = async (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    ste: State,
): Promise<DatabaseModel> => {
    if (!cpy.port || !cpy.port.isOpen()) {
        const err = 'Database port is not connected. Call initDatabase first.'
        await emitConsole(ste, `:: [DATABASE:SCHEMA] [FAIL] ${err}`)
        if (bal?.slv) bal.slv({ err })
        return cpy
    }

    try {
        cpy.port.exec(LOCAL_FOUR_VECTOR_DDL)

        const tables = (
            cpy.port
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC",
                )
                .all() || []
        ).map((r: any) => r.name)

        const triggers = (
            cpy.port
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name ASC",
                )
                .all() || []
        ).map((r: any) => r.name)

        const integrityRow = cpy.port.prepare('PRAGMA integrity_check').get()
        const integrity = integrityRow?.integrity_check || 'ok'

        cpy.status = {
            initialized: true,
            tableCount: tables.length,
            tables,
            triggers,
            integrity,
            timestamp: new Date().toISOString(),
        }
        if (ste?.value?.database) {
            ste.value.database.status = cpy.status
        }

        await emitConsole(
            ste,
            `>> [DATABASE:SCHEMA] [OK] Self-healing bootstrap certified. ${tables.length} tables, ${triggers.length} triggers online. Integrity: ${integrity}`,
        )

        if (bal?.slv) {
            bal.slv({
                dbBit: { idx: 'ensure-schema-database', val: tables.length },
                status: cpy.status,
            })
        }
    } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        await emitConsole(ste, `:: [DATABASE:SCHEMA] [FAIL] ${errorMsg}`)
        if (bal?.slv) {
            bal.slv({ err: errorMsg })
        }
    }

    return cpy
}

export const execDatabase = (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    _ste: State,
): DatabaseModel => {
    if (!cpy.port || !cpy.port.isOpen()) {
        if (bal?.slv) bal.slv({ err: 'Database closed' })
        return cpy
    }

    const sql = bal?.src || bal?.dat?.sql
    if (!sql) {
        if (bal?.slv) bal.slv({ err: 'No SQL statement provided' })
        return cpy
    }

    try {
        cpy.port.exec(sql)
        if (bal?.slv) bal.slv({ dbBit: { idx: 'exec-database', src: sql } })
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const queryDatabase = (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    _ste: State,
): DatabaseModel => {
    if (!cpy.port || !cpy.port.isOpen()) {
        if (bal?.slv) bal.slv({ err: 'Database closed' })
        return cpy
    }

    const sql = bal?.src || bal?.dat?.sql
    const params = Array.isArray(bal?.dat) ? bal.dat : bal?.dat?.params || []
    const single = Boolean(bal?.dat?.single)

    if (!sql) {
        if (bal?.slv) bal.slv({ err: 'No SQL query provided' })
        return cpy
    }

    try {
        const stmt = cpy.port.prepare(sql)
        if (single) {
            const row = Array.isArray(params)
                ? stmt.get(...params)
                : stmt.get(params)
            if (bal?.slv) bal.slv({ row, rows: row ? [row] : [] })
        } else {
            const rows = Array.isArray(params)
                ? stmt.all(...params)
                : stmt.all(params)
            if (bal?.slv) bal.slv({ rows })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const execBatchDatabase = (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    _ste: State,
): DatabaseModel => {
    if (!cpy.port || !cpy.port.isOpen()) {
        if (bal?.slv) bal.slv({ err: 'Database closed' })
        return cpy
    }

    const statements: Array<{ sql: string; params?: any[] }> =
        bal?.dat?.statements || []

    try {
        const tx = cpy.port.transaction(() => {
            let changes = 0
            for (const item of statements) {
                const stmt = cpy.port!.prepare(item.sql)
                const res = item.params ? stmt.run(...item.params) : stmt.run()
                changes += res.changes || 0
            }
            return changes
        })

        const totalChanges = tx()
        if (bal?.slv) {
            bal.slv({
                dbBit: { idx: 'exec-batch-database', val: totalChanges },
                res: { changes: totalChanges, lastInsertRowid: 0 },
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const checkIntegrityDatabase = (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    _ste: State,
): DatabaseModel => {
    if (!cpy.port || !cpy.port.isOpen()) {
        if (bal?.slv) bal.slv({ err: 'Database closed' })
        return cpy
    }

    try {
        const row = cpy.port.prepare('PRAGMA integrity_check').get()
        const result = row?.integrity_check || 'ok'
        if (bal?.slv)
            bal.slv({ dbBit: { idx: 'check-integrity-database', src: result } })
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const closeDatabase = (
    cpy: DatabaseModel,
    bal: DatabaseBit,
    ste?: State,
): DatabaseModel => {
    if (cpy.port && cpy.port.isOpen()) {
        cpy.port.close()
        cpy.port = null
        cpy.status.initialized = false
    }
    if (ste?.value?.database) {
        ste.value.database.port = null
        if (ste.value.database.status) {
            ste.value.database.status.initialized = false
        }
    }
    if (bal?.slv) bal.slv({ dbBit: { idx: 'close-database' } })
    return cpy
}
