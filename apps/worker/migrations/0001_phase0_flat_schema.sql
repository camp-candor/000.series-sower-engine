CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    standing TEXT NOT NULL DEFAULT 'GOOD',
    version INTEGER NOT NULL DEFAULT 1,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    CHECK(scope IN ('CHARACTER', 'LOCATION', 'LOGISTIC', 'LAW'))
);

CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    is_dirty INTEGER NOT NULL DEFAULT 0,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scene_fact_dependencies (
    scene_id TEXT NOT NULL,
    fact_id TEXT NOT NULL,
    pinned_version INTEGER NOT NULL,
    PRIMARY KEY (scene_id, fact_id),
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trg_fact_version_bump
AFTER UPDATE ON facts
FOR EACH ROW
WHEN NEW.version > OLD.version OR NEW.standing = 'DEPRECATED_ARCHIVED'
BEGIN
    UPDATE scenes
    SET is_dirty = 1
    WHERE id IN (
        SELECT scene_id FROM scene_fact_dependencies
        WHERE fact_id = NEW.id AND (pinned_version < NEW.version OR NEW.standing = 'DEPRECATED_ARCHIVED')
    );
END;

CREATE VIEW IF NOT EXISTS v_fact_centrality_telemetry AS
SELECT f.id as fact_id, COUNT(sfd.scene_id) as dependency_count
FROM facts f
LEFT JOIN scene_fact_dependencies sfd ON f.id = sfd.fact_id
GROUP BY f.id;
