-- Migration: 0004_add_paranoia_clocks.sql
-- Four-Vector Dynamic Relational State, Append-Only Event Log & Tension Clocks

CREATE TABLE IF NOT EXISTS event_log (
    event_id TEXT PRIMARY KEY,
    sequence_number INTEGER NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    state_hash TEXT NOT NULL,
    seed TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_seq ON event_log(sequence_number ASC);

CREATE TABLE IF NOT EXISTS entities_live (
    entity_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('CHARACTER', 'LOCATION', 'OBJECT')),
    q INTEGER,
    r INTEGER,
    location_id TEXT,
    arms_available INTEGER NOT NULL DEFAULT 2 CHECK(arms_available BETWEEN 0 AND 2),
    locomotion_tier TEXT NOT NULL DEFAULT 'UNRESTRICTED' CHECK(locomotion_tier IN ('UNRESTRICTED', 'LIMPING', 'IMMOBILIZED')),
    concussion_level INTEGER NOT NULL DEFAULT 0 CHECK(concussion_level BETWEEN 0 AND 3),
    open_wounds_json TEXT NOT NULL DEFAULT '[]',
    held_items_json TEXT NOT NULL DEFAULT '[]',
    worn_gear_json TEXT NOT NULL DEFAULT '{}',
    slung_items_json TEXT NOT NULL DEFAULT '[]',
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_loc ON entities_live(location_id);

CREATE TABLE IF NOT EXISTS strings_ledger (
    id TEXT PRIMARY KEY,
    holder_id TEXT NOT NULL REFERENCES entities_live(entity_id),
    debtor_id TEXT NOT NULL REFERENCES entities_live(entity_id),
    weight_bps INTEGER NOT NULL CHECK(weight_bps BETWEEN 0 AND 10000),
    created_at_ms INTEGER NOT NULL,
    CHECK (holder_id != debtor_id)
);

CREATE INDEX IF NOT EXISTS idx_strings_pair ON strings_ledger(holder_id, debtor_id);

CREATE TABLE IF NOT EXISTS grievance_status (
    grievance_id TEXT PRIMARY KEY,
    escalation_depth INTEGER NOT NULL DEFAULT 0,
    cooldown_cycles INTEGER NOT NULL DEFAULT 0,
    intensity_bps INTEGER NOT NULL CHECK(intensity_bps BETWEEN 0 AND 10000),
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS paranoia_clocks (
    clock_id TEXT PRIMARY KEY,
    clock_name TEXT NOT NULL,
    value_bps INTEGER NOT NULL CHECK(value_bps BETWEEN 0 AND 10000),
    threshold_bps INTEGER NOT NULL CHECK(threshold_bps BETWEEN 0 AND 10000),
    decay_rate_bps INTEGER NOT NULL CHECK(decay_rate_bps BETWEEN 0 AND 10000),
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clocks_val ON paranoia_clocks(value_bps, threshold_bps);
