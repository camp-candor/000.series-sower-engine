import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { LedgerSchemaManager } from '../../src/core/ledger/schema.js';
import type { D1Database } from '@cloudflare/workers-types';

describe('Phase 3: Ledger Schema D1 Manager & Constraints', () => {
    let schemaManager: LedgerSchemaManager;

    beforeEach(async () => {
        schemaManager = new LedgerSchemaManager((env as any).CANON_DB as D1Database);

        // Execute migrations statement by statement
        const stmts = [
            "CREATE TABLE IF NOT EXISTS facts (id TEXT PRIMARY KEY, scope TEXT NOT NULL CHECK(scope IN ('CHARACTER', 'LOCATION', 'LOGISTIC', 'LAW')), standing TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, is_dirty INTEGER NOT NULL DEFAULT 0, created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS scene_fact_dependencies (scene_id TEXT NOT NULL, fact_id TEXT NOT NULL, pinned_version INTEGER NOT NULL, PRIMARY KEY (scene_id, fact_id), FOREIGN KEY (scene_id) REFERENCES scenes(id), FOREIGN KEY (fact_id) REFERENCES facts(id))",
            "CREATE TRIGGER IF NOT EXISTS trg_fact_version_bump AFTER UPDATE ON facts FOR EACH ROW WHEN (NEW.version > OLD.version) OR (NEW.standing = 'DEPRECATED_ARCHIVED') BEGIN UPDATE scenes SET is_dirty = 1 WHERE id IN (SELECT scene_id FROM scene_fact_dependencies WHERE fact_id = NEW.id AND pinned_version < NEW.version); END",
            "CREATE VIEW IF NOT EXISTS v_fact_centrality_telemetry AS SELECT f.id as fact_id, COUNT(sfd.scene_id) as scene_dependency_count FROM facts f LEFT JOIN scene_fact_dependencies sfd ON f.id = sfd.fact_id GROUP BY f.id",
            "CREATE TABLE IF NOT EXISTS event_log (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, payload TEXT NOT NULL, created_at_ms INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS entities_live (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, status TEXT NOT NULL, created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS strings_ledger (id TEXT PRIMARY KEY, key TEXT NOT NULL, value TEXT NOT NULL, created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS grievance_status (id TEXT PRIMARY KEY, holder_id TEXT NOT NULL, debtor_id TEXT NOT NULL, status TEXT NOT NULL, created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL, CHECK (holder_id != debtor_id))",
            "CREATE TABLE IF NOT EXISTS paranoia_clocks (id TEXT PRIMARY KEY, clock_name TEXT NOT NULL, basis_points INTEGER NOT NULL CHECK (basis_points BETWEEN 0 AND 10000), created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL)"
        ];

        for (const stmt of stmts) {
            await (env as any).CANON_DB.prepare(stmt).run();
        }
    });

    it('should exist DDL and correctly initialize tables', async () => {
        const { results } = await (env as any).CANON_DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tables = results.map((r: any) => r.name);
        expect(tables).toContain('facts');
        expect(tables).toContain('scenes');
        expect(tables).toContain('scene_fact_dependencies');
        expect(tables).toContain('event_log');
        expect(tables).toContain('entities_live');
        expect(tables).toContain('strings_ledger');
        expect(tables).toContain('grievance_status');
        expect(tables).toContain('paranoia_clocks');
    });

    it('enforces monotonic version bumps and throws ILLEGAL_VERSION_MUTATION', async () => {
        await (env as any).CANON_DB.prepare(
            "INSERT INTO facts (id, scope, standing, version, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind('fact_1', 'CHARACTER', 'GOOD', 5, Date.now(), Date.now()).run();

        await expect(schemaManager.updateFactVersion('fact_1', 4)).rejects.toThrow(/ILLEGAL_VERSION_MUTATION/);
        await expect(schemaManager.updateFactVersion('fact_1', 5)).rejects.toThrow(/ILLEGAL_VERSION_MUTATION/);

        await expect(schemaManager.updateFactVersion('fact_1', 6)).resolves.not.toThrow();

        const updated = await (env as any).CANON_DB.prepare("SELECT version FROM facts WHERE id = ?").bind('fact_1').first();
        expect(updated?.version).toBe(6);
    });

    it('handles trigger invalidations', async () => {
        await (env as any).CANON_DB.prepare(
            "INSERT INTO facts (id, scope, standing, version, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind('fact_trigger', 'LOCATION', 'GOOD', 1, Date.now(), Date.now()).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)"
        ).bind('scene_1', 0, Date.now(), Date.now()).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES (?, ?, ?)"
        ).bind('scene_1', 'fact_trigger', 1).run();

        // Trigger the bump
        await schemaManager.updateFactVersion('fact_trigger', 2);

        // Check if scene was invalidated (dirty)
        const scene = await (env as any).CANON_DB.prepare("SELECT is_dirty FROM scenes WHERE id = ?").bind('scene_1').first();
        expect(scene?.is_dirty).toBe(1);
    });

    it('supports "Still Good" standing isolation (no version bump or trigger)', async () => {
        await (env as any).CANON_DB.prepare(
            "INSERT INTO facts (id, scope, standing, version, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind('fact_review', 'LOGISTIC', 'GOOD', 1, Date.now(), Date.now()).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)"
        ).bind('scene_2', 0, Date.now(), Date.now()).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES (?, ?, ?)"
        ).bind('scene_2', 'fact_review', 1).run();

        await schemaManager.setFactStanding('fact_review', 'FLAGGED_FOR_REVIEW');

        const fact = await (env as any).CANON_DB.prepare("SELECT version, standing FROM facts WHERE id = ?").bind('fact_review').first();
        expect(fact?.version).toBe(1); // Version unchanged
        expect(fact?.standing).toBe('FLAGGED_FOR_REVIEW');

        const scene = await (env as any).CANON_DB.prepare("SELECT is_dirty FROM scenes WHERE id = ?").bind('scene_2').first();
        expect(scene?.is_dirty).toBe(0); // Scene remains clean
    });

    it('returns centrality telemetry', async () => {
        await (env as any).CANON_DB.prepare(
            "INSERT INTO facts (id, scope, standing, version, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind('fact_central', 'LAW', 'GOOD', 1, Date.now(), Date.now()).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)"
        ).bind('scene_3', 0, Date.now(), Date.now()).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scenes (id, is_dirty, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)"
        ).bind('scene_4', 0, Date.now(), Date.now()).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES (?, ?, ?)"
        ).bind('scene_3', 'fact_central', 1).run();

        await (env as any).CANON_DB.prepare(
            "INSERT INTO scene_fact_dependencies (scene_id, fact_id, pinned_version) VALUES (?, ?, ?)"
        ).bind('scene_4', 'fact_central', 1).run();

        const telemetry = await schemaManager.getFactCentralityTelemetry();
        const stat = telemetry.find(t => t.fact_id === 'fact_central');
        expect(stat).toBeDefined();
        expect(stat?.scene_dependency_count).toBe(2);
    });
});
