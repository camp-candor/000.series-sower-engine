import { env } from 'cloudflare:test';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { LedgerSchemaManager } from '../../src/core/ledger/schema.js';

describe('LedgerSchemaManager', () => {
    let db: D1Database;
    let manager: LedgerSchemaManager;

    beforeAll(async () => {
        db = (env as any).CANON_DB as D1Database;
        await db.prepare(`CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    standing TEXT NOT NULL DEFAULT 'GOOD',
    version INTEGER NOT NULL DEFAULT 1,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    CHECK(scope IN ('CHARACTER', 'LOCATION', 'LOGISTIC', 'LAW'))
);`).run();
        await db.prepare(`CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    is_dirty INTEGER NOT NULL DEFAULT 0,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);`).run();
        await db.prepare(`CREATE TABLE IF NOT EXISTS scene_fact_dependencies (
    scene_id TEXT NOT NULL,
    fact_id TEXT NOT NULL,
    pinned_version INTEGER NOT NULL,
    PRIMARY KEY (scene_id, fact_id),
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
);`).run();
        await db.prepare(`CREATE TRIGGER IF NOT EXISTS trg_fact_version_bump
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
END;`).run();
        await db.prepare(`CREATE VIEW IF NOT EXISTS v_fact_centrality_telemetry AS
SELECT f.id as fact_id, COUNT(sfd.scene_id) as dependency_count
FROM facts f
LEFT JOIN scene_fact_dependencies sfd ON f.id = sfd.fact_id
GROUP BY f.id;`).run();
    });

    beforeEach(async () => {
        db = (env as any).CANON_DB as D1Database;
        manager = new LedgerSchemaManager(db);

        // Clean up database before each test
        await db.prepare('DELETE FROM scene_fact_dependencies').run();
        await db.prepare('DELETE FROM scenes').run();
        await db.prepare('DELETE FROM facts').run();
    });

    it('should initialize core schema', async () => {
        await manager.initializeCoreSchema();
        expect(true).toBe(true);
    });

    it('should throw ILLEGAL_VERSION_MUTATION on non-monotonic version bumps', async () => {
        const factId = 'fact-1';
        await db.prepare(`INSERT INTO facts (id, scope, version, created_at_ms, updated_at_ms) VALUES (?, 'LOGISTIC', 2, 0, 0)`).bind(factId).run();

        await expect(manager.updateFactVersion(factId, 2)).rejects.toThrow('ILLEGAL_VERSION_MUTATION');
        await expect(manager.updateFactVersion(factId, 1)).rejects.toThrow('ILLEGAL_VERSION_MUTATION');
    });

    it('should allow monotonic version bumps', async () => {
        const factId = 'fact-2';
        await db.prepare(`INSERT INTO facts (id, scope, version, created_at_ms, updated_at_ms) VALUES (?, 'LOGISTIC', 2, 0, 0)`).bind(factId).run();

        await manager.updateFactVersion(factId, 3);

        const fact = await db.prepare('SELECT version FROM facts WHERE id = ?').bind(factId).first<{ version: number }>();
        expect(fact?.version).toBe(3);
    });

    it('should isolate "Still Good" standing without invalidating scenes (FLAGGED_FOR_REVIEW)', async () => {
        const factId = 'fact-3';
        const sceneId = 'scene-1';
        await db.prepare(`INSERT INTO facts (id, scope, version, created_at_ms, updated_at_ms) VALUES (?, 'LOGISTIC', 1, 0, 0)`).bind(factId).run();
        await db.prepare(`INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES (?, 0, 0, 0)`).bind(sceneId).run();
        await db.prepare(`INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES (?, ?, 1)`).bind(sceneId, factId).run();

        await manager.setFactStanding(factId, 'FLAGGED_FOR_REVIEW');

        const fact = await db.prepare('SELECT standing, version FROM facts WHERE id = ?').bind(factId).first<{ standing: string, version: number }>();
        expect(fact?.standing).toBe('FLAGGED_FOR_REVIEW');
        expect(fact?.version).toBe(1);

        const scene = await db.prepare('SELECT is_dirty FROM scenes WHERE id = ?').bind(sceneId).first<{ is_dirty: number }>();
        expect(scene?.is_dirty).toBe(0);
    });

    it('should invalidate scenes when standing is DEPRECATED_ARCHIVED', async () => {
        const factId = 'fact-4';
        const sceneId = 'scene-2';
        await db.prepare(`INSERT INTO facts (id, scope, version, created_at_ms, updated_at_ms) VALUES (?, 'LOGISTIC', 1, 0, 0)`).bind(factId).run();
        await db.prepare(`INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES (?, 0, 0, 0)`).bind(sceneId).run();
        await db.prepare(`INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES (?, ?, 1)`).bind(sceneId, factId).run();

        await db.prepare(`UPDATE facts SET standing = 'DEPRECATED_ARCHIVED' WHERE id = ?`).bind(factId).run();

        const scene = await db.prepare('SELECT is_dirty FROM scenes WHERE id = ?').bind(sceneId).first<{ is_dirty: number }>();
        expect(scene?.is_dirty).toBe(1);
    });

    it('should track centrality telemetry', async () => {
        const factId = 'fact-5';
        await db.prepare(`INSERT INTO facts (id, scope, version, created_at_ms, updated_at_ms) VALUES (?, 'LOGISTIC', 1, 0, 0)`).bind(factId).run();
        await db.prepare(`INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES ('s1', 0, 0, 0)`).run();
        await db.prepare(`INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES ('s2', 0, 0, 0)`).run();

        await db.prepare(`INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES ('s1', ?, 1)`).bind(factId).run();
        await db.prepare(`INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES ('s2', ?, 1)`).bind(factId).run();

        const telemetry = await db.prepare('SELECT dependency_count FROM v_fact_centrality_telemetry WHERE fact_id = ?').bind(factId).first<{ dependency_count: number }>();
        expect(telemetry?.dependency_count).toBe(2);
    });
});
