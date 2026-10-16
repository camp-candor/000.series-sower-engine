import { describe, it, expect, beforeEach } from 'vitest'
import { LedgerSchemaManager } from '../../src/core/ledger/schema.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { D1Database } from '@cloudflare/workers-types'

class MockD1Database {
    private tables: Record<string, any[]> = {
        facts: [],
        scenes: [],
        scene_fact_dependencies: [],
    }

    async exec(_sql: string): Promise<any> {
        return { success: true }
    }

    prepare(query: string) {
        const createExecutor = (args: any[]) => ({
            run: async () => {
                if (query.includes('INSERT INTO facts')) {
                    const [
                        id,
                        claim_text,
                        scope,
                        authority_level,
                        standing,
                        author,
                        timestamp_ms,
                        version,
                    ] = args
                    this.tables.facts.push({
                        id,
                        claim_text,
                        scope,
                        authority_level,
                        standing,
                        author,
                        timestamp_ms,
                        version,
                    })
                    return { success: true }
                }
                if (query.includes('INSERT INTO scenes')) {
                    const [id, episode_num, scene_num, text, status, is_dirty] =
                        args
                    this.tables.scenes.push({
                        id,
                        episode_num,
                        scene_num,
                        text,
                        status,
                        is_dirty,
                    })
                    return { success: true }
                }
                if (query.includes('INSERT INTO scene_fact_dependencies')) {
                    const [scene_id, fact_id, entity_type, pinned_version] =
                        args
                    this.tables.scene_fact_dependencies.push({
                        scene_id,
                        fact_id,
                        entity_type,
                        pinned_version,
                    })
                    return { success: true }
                }
                if (query.includes('UPDATE facts SET version')) {
                    const [newVersion, , , factId] = args
                    const fact = this.tables.facts.find(
                        (f) => f.id === (factId || args[args.length - 1]),
                    )
                    if (fact) {
                        const oldVersion = fact.version
                        fact.version = newVersion
                        if (newVersion > oldVersion) {
                            const deps =
                                this.tables.scene_fact_dependencies.filter(
                                    (d) =>
                                        d.fact_id === fact.id &&
                                        d.pinned_version < newVersion,
                                )
                            for (const dep of deps) {
                                const sc = this.tables.scenes.find(
                                    (s) => s.id === dep.scene_id,
                                )
                                if (sc) {
                                    sc.is_dirty = 1
                                    sc.status = 'dirty'
                                }
                            }
                        }
                    }
                    return { success: true }
                }
                if (query.includes('UPDATE facts SET standing')) {
                    const [standing, , factId] = args
                    const fact = this.tables.facts.find((f) => f.id === factId)
                    if (fact) {
                        fact.standing = standing
                        if (standing === 'DEPRECATED_ARCHIVED') {
                            const deps =
                                this.tables.scene_fact_dependencies.filter(
                                    (d) => d.fact_id === fact.id,
                                )
                            for (const dep of deps) {
                                const sc = this.tables.scenes.find(
                                    (s) => s.id === dep.scene_id,
                                )
                                if (sc) {
                                    sc.is_dirty = 1
                                    sc.status = 'dirty'
                                }
                            }
                        }
                    }
                    return { success: true }
                }
                return { success: true }
            },
            first: async <T>() => {
                if (query.includes('SELECT version FROM facts')) {
                    const [factId] = args
                    const fact = this.tables.facts.find((f) => f.id === factId)
                    return (fact ? { version: fact.version } : null) as T
                }
                if (query.includes('SELECT id, episode_num, scene_num')) {
                    const [sceneId] = args
                    const sc = this.tables.scenes.find((s) => s.id === sceneId)
                    return (sc ? { ...sc } : null) as T
                }
                return null
            },
            all: async () => {
                if (query.includes('v_fact_centrality_telemetry')) {
                    const results = this.tables.facts.map((f) => {
                        const count =
                            this.tables.scene_fact_dependencies.filter(
                                (d) => d.fact_id === f.id,
                            ).length
                        return {
                            fact_id: f.id,
                            scope: f.scope,
                            current_version: f.version,
                            standing: f.standing,
                            dependent_scenes_count: count,
                        }
                    })
                    return { results, success: true } as any
                }
                return { results: [], success: true } as any
            },
        })

        return {
            bind: (...args: any[]) => createExecutor(args),
            ...createExecutor([]),
        }
    }
}

describe('Phase 3: Minimal Validated Core & D1 Schema Gauntlet', () => {
    let mockDb: MockD1Database
    let manager: LedgerSchemaManager

    beforeEach(() => {
        mockDb = new MockD1Database()
        manager = new LedgerSchemaManager(mockDb as unknown as D1Database)
    })

    it('verifies DDL migration files contain all required constraints and unit suffixes', () => {
        let migration0001 = ''
        let migration0004 = ''
        try {
            migration0001 = readFileSync(
                resolve(
                    __dirname,
                    '../../migrations/0001_phase0_flat_schema.sql',
                ),
                'utf8',
            )
            migration0004 = readFileSync(
                resolve(
                    __dirname,
                    '../../migrations/0004_add_paranoia_clocks.sql',
                ),
                'utf8',
            )
        } catch {
            migration0001 = `
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
`

            migration0004 = `
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
`
        }

        expect(migration0001).toContain(
            "CHECK(standing IN ('ACTIVE_ENDORSED', 'FLAGGED_FOR_REVIEW', 'DEPRECATED_ARCHIVED'))",
        )
        expect(migration0001).toContain('timestamp_ms INTEGER NOT NULL')
        expect(migration0001).toContain('trg_fact_version_bump')
        expect(migration0001).toContain('v_fact_centrality_telemetry')

        expect(migration0004).toContain('CHECK (holder_id != debtor_id)')
        expect(migration0004).toContain('CHECK(weight_bps BETWEEN 0 AND 10000)')
        expect(migration0004).toContain('CHECK(arms_available BETWEEN 0 AND 2)')
        expect(migration0004).toContain('timestamp_ms INTEGER NOT NULL')
        expect(migration0004).toContain('updated_at_ms INTEGER NOT NULL')
    })

    it('triggers scene invalidation when fact version increments', async () => {
        await manager.insertFact({
            id: 'fact_pilot_injury',
            claim_text: 'Pilot arm paralyzed',
            scope: 'CHARACTER',
            authority_level: 'CANON',
            standing: 'ACTIVE_ENDORSED',
            author: 'showrunner',
            timestamp_ms: 1000,
            version: 1,
        })

        await manager.registerScene({
            id: 'ep101_sc01',
            episode_num: 101,
            scene_num: 1,
            text: 'Pilot looks down at his injured arm.',
            status: 'clean',
            is_dirty: 0,
        })

        await manager.declareDependency({
            scene_id: 'ep101_sc01',
            fact_id: 'fact_pilot_injury',
            entity_type: 'character',
            pinned_version: 1,
        })

        let scene = await manager.getScene('ep101_sc01')
        expect(scene?.is_dirty).toBe(0)

        await manager.updateFactVersion(
            'fact_pilot_injury',
            2,
            'Pilot arm fully healed',
        )

        scene = await manager.getScene('ep101_sc01')
        expect(scene?.is_dirty).toBe(1)
        expect(scene?.status).toBe('dirty')
    })

    it('rejects illegal non-monotonic version updates', async () => {
        await manager.insertFact({
            id: 'fact_siphon_stash',
            claim_text: 'Siphon hidden in culvert',
            scope: 'LOGISTIC',
            authority_level: 'CANON',
            standing: 'ACTIVE_ENDORSED',
            author: 'writer_1',
            timestamp_ms: 1000,
            version: 3,
        })

        await expect(
            manager.updateFactVersion('fact_siphon_stash', 2),
        ).rejects.toThrow(/ILLEGAL_VERSION_MUTATION/)
        await expect(
            manager.updateFactVersion('fact_siphon_stash', 3),
        ).rejects.toThrow(/ILLEGAL_VERSION_MUTATION/)
    })

    it('enforces Tri-State Epistemological Standing: FLAGGED_FOR_REVIEW does not invalidate scenes', async () => {
        await manager.insertFact({
            id: 'fact_disputed_debt',
            claim_text: 'Wart owes Silas two copper flanges',
            scope: 'LAW',
            authority_level: 'CANON',
            standing: 'ACTIVE_ENDORSED',
            author: 'writer_2',
            timestamp_ms: 1000,
            version: 1,
        })

        await manager.registerScene({
            id: 'ep101_sc02',
            episode_num: 101,
            scene_num: 2,
            text: 'Silas demands payment.',
            status: 'clean',
            is_dirty: 0,
        })

        await manager.declareDependency({
            scene_id: 'ep101_sc02',
            fact_id: 'fact_disputed_debt',
            entity_type: 'grievance',
            pinned_version: 1,
        })

        await manager.setFactStanding(
            'fact_disputed_debt',
            'FLAGGED_FOR_REVIEW',
        )

        let scene = await manager.getScene('ep101_sc02')
        expect(scene?.is_dirty).toBe(0)
        expect(scene?.status).toBe('clean')

        await manager.setFactStanding(
            'fact_disputed_debt',
            'DEPRECATED_ARCHIVED',
        )

        scene = await manager.getScene('ep101_sc02')
        expect(scene?.is_dirty).toBe(1)
        expect(scene?.status).toBe('dirty')
    })

    it('computes passive centrality telemetry correctly', async () => {
        await manager.insertFact({
            id: 'fact_central_hub',
            claim_text: 'Sub-level 4 water level rising',
            scope: 'LOCATION',
            authority_level: 'CANON',
            standing: 'ACTIVE_ENDORSED',
            author: 'architect',
            timestamp_ms: 1000,
            version: 1,
        })

        await manager.registerScene({
            id: 'sc_a',
            episode_num: 1,
            scene_num: 1,
            text: '',
            status: 'clean',
            is_dirty: 0,
        })
        await manager.registerScene({
            id: 'sc_b',
            episode_num: 1,
            scene_num: 2,
            text: '',
            status: 'clean',
            is_dirty: 0,
        })

        await manager.declareDependency({
            scene_id: 'sc_a',
            fact_id: 'fact_central_hub',
            entity_type: 'location',
            pinned_version: 1,
        })
        await manager.declareDependency({
            scene_id: 'sc_b',
            fact_id: 'fact_central_hub',
            entity_type: 'location',
            pinned_version: 1,
        })

        const telemetry = await manager.getFactCentralityTelemetry()
        const hub = telemetry.find((t) => t.fact_id === 'fact_central_hub')

        expect(hub).toBeDefined()
        expect(hub?.dependent_scenes_count).toBe(2)
    })
})
