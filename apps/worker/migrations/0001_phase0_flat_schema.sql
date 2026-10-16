-- Migration: 0001_phase0_flat_schema.sql
-- Stage A: Canonical Narrative Facts Ledger & Scene Dependency Invalidation

CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    claim_text TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('CHARACTER', 'LOCATION', 'LOGISTIC', 'LAW')),
    authority_level TEXT NOT NULL CHECK(authority_level IN ('AXIOM', 'CANON', 'EVENT', 'RUNTIME_STATE', 'PROJECTION', 'SPECULATION')),
    standing TEXT NOT NULL DEFAULT 'ACTIVE_ENDORSED' CHECK(standing IN ('ACTIVE_ENDORSED', 'FLAGGED_FOR_REVIEW', 'DEPRECATED_ARCHIVED')),
    author TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_facts_scope ON facts(scope, standing);

CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    episode_num INTEGER NOT NULL,
    scene_num INTEGER NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'clean' CHECK(status IN ('clean', 'dirty', 'reviewed')),
    is_dirty INTEGER NOT NULL DEFAULT 0 CHECK(is_dirty IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_scenes_dirty ON scenes(is_dirty, status);

CREATE TABLE IF NOT EXISTS scene_fact_dependencies (
    scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    fact_id TEXT NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('character', 'location', 'possession', 'grievance', 'axiom')),
    pinned_version INTEGER NOT NULL,
    PRIMARY KEY (scene_id, fact_id)
);

CREATE INDEX IF NOT EXISTS idx_deps_fact_pinned ON scene_fact_dependencies(fact_id, pinned_version);

-- Invalidation Trigger: Fires when fact version increments or when standing is retired
CREATE TRIGGER IF NOT EXISTS trg_fact_version_bump
AFTER UPDATE ON facts
FOR EACH ROW
WHEN (NEW.version > OLD.version) OR (OLD.standing != 'DEPRECATED_ARCHIVED' AND NEW.standing = 'DEPRECATED_ARCHIVED')
BEGIN
    UPDATE scenes
    SET is_dirty = 1,
        status = 'dirty'
    WHERE id IN (
        SELECT sfd.scene_id
        FROM scene_fact_dependencies sfd
        WHERE sfd.fact_id = NEW.id
          AND sfd.pinned_version < NEW.version
    );
END;

-- Passive Centrality Telemetry View: Blast-radius in-degree calculation
CREATE VIEW IF NOT EXISTS v_fact_centrality_telemetry AS
SELECT 
    f.id AS fact_id,
    f.scope,
    f.version AS current_version,
    f.standing,
    COUNT(sfd.scene_id) AS dependent_scenes_count
FROM facts f
LEFT JOIN scene_fact_dependencies sfd ON f.id = sfd.fact_id
GROUP BY f.id, f.scope, f.version, f.standing;
