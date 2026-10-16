CREATE TABLE IF NOT EXISTS event_log (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entities_live (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS strings_ledger (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS grievance_status (
    id TEXT PRIMARY KEY,
    holder_id TEXT NOT NULL,
    debtor_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    CHECK (holder_id != debtor_id)
);

CREATE TABLE IF NOT EXISTS paranoia_clocks (
    id TEXT PRIMARY KEY,
    clock_name TEXT NOT NULL,
    basis_points INTEGER NOT NULL CHECK (basis_points BETWEEN 0 AND 10000),
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);
