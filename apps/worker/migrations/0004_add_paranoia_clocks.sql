CREATE TABLE IF NOT EXISTS event_log (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entities_live (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS strings_ledger (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS grievance_status (
    holder_id TEXT NOT NULL,
    debtor_id TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    PRIMARY KEY (holder_id, debtor_id),
    CHECK (holder_id != debtor_id)
);

CREATE TABLE IF NOT EXISTS paranoia_clocks (
    entity_id TEXT PRIMARY KEY,
    meter_value INTEGER NOT NULL DEFAULT 0,
    updated_at_ms INTEGER NOT NULL,
    CHECK (meter_value BETWEEN 0 AND 10000)
);
