export const FOUR_VECTOR_AND_CONTINUITY_DDL = `
-- ==============================================================================
-- 1. HISTORICAL TRUTH VECTOR (APPEND-ONLY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS event_log (
  sequence_number INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  tick INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  seed TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL
);

-- ==============================================================================
-- 2. SOMATIC & SPATIAL VECTORS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS entities_live (
  entity_id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  q INTEGER NOT NULL DEFAULT 0,
  r INTEGER NOT NULL DEFAULT 0,
  arms_available INTEGER NOT NULL CHECK(arms_available BETWEEN 0 AND 2),
  legs_available INTEGER NOT NULL CHECK(legs_available BETWEEN 0 AND 2),
  locomotion_tier TEXT NOT NULL CHECK(locomotion_tier IN ('UNRESTRICTED', 'LIMPING', 'IMMOBILIZED')),
  concussion_level INTEGER NOT NULL CHECK(concussion_level BETWEEN 0 AND 3),
  wounds_json TEXT NOT NULL DEFAULT '[]',
  held_items_json TEXT NOT NULL DEFAULT '[]',
  worn_gear_json TEXT NOT NULL DEFAULT '[]',
  slung_items_json TEXT NOT NULL DEFAULT '[]',
  updated_at_ms INTEGER NOT NULL
);

-- ==============================================================================
-- 3. RELATIONAL DEBT VECTOR (ANTI-REFLEXIVE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS strings_ledger (
  string_id TEXT PRIMARY KEY,
  holder_id TEXT NOT NULL,
  debtor_id TEXT NOT NULL,
  weight_bps INTEGER NOT NULL CHECK(weight_bps BETWEEN 0 AND 10000),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  CHECK (holder_id <> debtor_id)
);

CREATE INDEX IF NOT EXISTS idx_strings_holder ON strings_ledger(holder_id);
CREATE INDEX IF NOT EXISTS idx_strings_debtor ON strings_ledger(debtor_id);

-- ==============================================================================
-- 4. CONFLICT ESCALATION VECTOR
-- ==============================================================================
CREATE TABLE IF NOT EXISTS grievance_status (
  grievance_id TEXT PRIMARY KEY,
  initiator_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  escalation_stage INTEGER NOT NULL DEFAULT 0,
  cooldown_cycles INTEGER NOT NULL DEFAULT 0,
  intensity_bps INTEGER NOT NULL CHECK(intensity_bps BETWEEN 0 AND 10000),
  status TEXT NOT NULL CHECK(status IN ('DORMANT', 'ACTIVE', 'RESOLVED', 'ABANDONED')),
  updated_at_ms INTEGER NOT NULL,
  CHECK (initiator_id <> target_id)
);

-- ==============================================================================
-- 5. PSYCHOLOGICAL TENSION VECTOR
-- ==============================================================================
CREATE TABLE IF NOT EXISTS paranoia_clocks (
  clock_id TEXT PRIMARY KEY,
  entity_id TEXT,
  value_bps INTEGER NOT NULL CHECK(value_bps BETWEEN 0 AND 10000),
  threshold_bps INTEGER NOT NULL CHECK(threshold_bps BETWEEN 0 AND 10000),
  decay_rate_bps INTEGER NOT NULL CHECK(decay_rate_bps BETWEEN 0 AND 10000),
  updated_at_ms INTEGER NOT NULL
);

-- ==============================================================================
-- 6. EPISTEMIC HORIZON VECTOR
-- ==============================================================================
CREATE TABLE IF NOT EXISTS actor_beliefs (
  belief_id TEXT PRIMARY KEY,
  observer_id TEXT NOT NULL,
  fact_id TEXT NOT NULL,
  subjective_probability_bps INTEGER NOT NULL CHECK(subjective_probability_bps BETWEEN 0 AND 10000),
  source_type TEXT NOT NULL CHECK(source_type IN ('INFERENCE', 'TESTIMONY', 'DIRECT_OBSERVATION')),
  is_false_belief INTEGER NOT NULL CHECK(is_false_belief IN (0, 1)) DEFAULT 0,
  learned_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  UNIQUE(observer_id, fact_id)
);

-- ==============================================================================
-- 7. SALIENCE HARVEST QUEUE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS unratified_details (
  detail_id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  entity_id TEXT,
  salience_bps INTEGER NOT NULL CHECK(salience_bps BETWEEN 0 AND 10000),
  claim_proposal TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('STAGED', 'DISCARDED', 'RATIFIED')) DEFAULT 'STAGED',
  created_at_ms INTEGER NOT NULL,
  reviewed_at_ms INTEGER
);

-- ==============================================================================
-- 8, 9, 10. CONTINUITY SUBSTRATE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  claim_text TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('CHARACTER', 'LOCATION', 'LOGISTIC', 'LAW')),
  authority_level TEXT NOT NULL CHECK(authority_level IN ('AXIOM', 'CANON', 'EVENT', 'RUNTIME_STATE', 'PROJECTION', 'SPECULATION')),
  standing TEXT NOT NULL CHECK(standing IN ('ACTIVE_ENDORSED', 'FLAGGED_FOR_REVIEW', 'DEPRECATED_ARCHIVED')) DEFAULT 'ACTIVE_ENDORSED',
  author TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  episode_num INTEGER NOT NULL,
  scene_num INTEGER NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('clean', 'dirty', 'reviewed')) DEFAULT 'clean',
  is_dirty INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scene_fact_dependencies (
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  fact_id TEXT NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
  entity_type TEXT CHECK(entity_type IN ('character', 'location', 'possession', 'grievance', 'axiom')),
  pinned_version INTEGER NOT NULL,
  PRIMARY KEY (scene_id, fact_id)
);

CREATE VIEW IF NOT EXISTS v_fact_centrality_telemetry AS
SELECT
  f.id AS fact_id,
  f.scope,
  f.version,
  f.standing,
  COUNT(sfd.scene_id) AS downstream_scene_count
FROM facts f
LEFT JOIN scene_fact_dependencies sfd ON f.id = sfd.fact_id
GROUP BY f.id;
`

export const SCHEMA_TRIGGERS_DDL = `
-- ==============================================================================
-- IMMUTABILITY TRIGGERS ON event_log
-- ==============================================================================
CREATE TRIGGER IF NOT EXISTS trg_event_log_no_update
BEFORE UPDATE ON event_log
BEGIN
  SELECT RAISE(ABORT, '[IMMUTABILITY_VIOLATION] Updates forbidden on event_log');
END;

CREATE TRIGGER IF NOT EXISTS trg_event_log_no_delete
BEFORE DELETE ON event_log
BEGIN
  SELECT RAISE(ABORT, '[IMMUTABILITY_VIOLATION] Deletions forbidden on event_log');
END;

-- ==============================================================================
-- MONOTONIC VERSION CASCADE TRIGGER ON facts
-- ==============================================================================
CREATE TRIGGER IF NOT EXISTS trg_fact_version_bump
AFTER UPDATE ON facts
FOR EACH ROW
WHEN NEW.version > OLD.version OR NEW.standing = 'DEPRECATED_ARCHIVED'
BEGIN
  UPDATE scenes
  SET is_dirty = 1,
      status = 'dirty'
  WHERE id IN (
    SELECT scene_id
    FROM scene_fact_dependencies
    WHERE fact_id = NEW.id
      AND pinned_version < NEW.version
  );
END;
`
