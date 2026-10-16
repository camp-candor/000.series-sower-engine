import type { D1Database } from '@cloudflare/workers-types'
import type {
    FactRecord,
    SceneRecord,
    SceneFactDependencyRecord,
    FactCentralityTelemetry,
} from './types.js'

export class LedgerSchemaManager {
    constructor(private db: D1Database) {}

    async initializeCoreSchema(
        migrationSql0001: string,
        migrationSql0004: string,
    ): Promise<void> {
        try {
            await this.db.exec(migrationSql0001)
            await this.db.exec(migrationSql0004)
            console.log(
                '>> [D1:MIGRATE] Phase 3 Relational Core & Clocks migrations executed [OK]',
            )
        } catch (err: any) {
            console.error(`>> [D1:MIGRATE_ERROR] ${err.message} [FAIL]`)
            throw err
        }
    }

    async insertFact(
        fact: Omit<FactRecord, 'version'> & { version?: number },
    ): Promise<void> {
        const version = fact.version ?? 1
        await this.db
            .prepare(
                `INSERT INTO facts (id, claim_text, scope, authority_level, standing, author, timestamp_ms, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
                fact.id,
                fact.claim_text,
                fact.scope,
                fact.authority_level,
                fact.standing,
                fact.author,
                fact.timestamp_ms,
                version,
            )
            .run()
    }

    async updateFactVersion(
        factId: string,
        newVersion: number,
        newClaimText?: string,
    ): Promise<void> {
        const current = await this.db
            .prepare('SELECT version FROM facts WHERE id = ?')
            .bind(factId)
            .first<{ version: number }>()

        if (!current) {
            throw new Error(`[LEDGER_ERROR] Fact not found: ${factId}`)
        }

        if (newVersion <= current.version) {
            throw new Error(
                `[ILLEGAL_VERSION_MUTATION] NEW.version (${newVersion}) must be strictly greater than OLD.version (${current.version})`,
            )
        }

        if (newClaimText) {
            await this.db
                .prepare(
                    'UPDATE facts SET version = ?, claim_text = ?, timestamp_ms = ? WHERE id = ?',
                )
                .bind(newVersion, newClaimText, Date.now(), factId)
                .run()
        } else {
            await this.db
                .prepare(
                    'UPDATE facts SET version = ?, timestamp_ms = ? WHERE id = ?',
                )
                .bind(newVersion, Date.now(), factId)
                .run()
        }
    }

    async setFactStanding(
        factId: string,
        standing: FactRecord['standing'],
    ): Promise<void> {
        await this.db
            .prepare(
                'UPDATE facts SET standing = ?, timestamp_ms = ? WHERE id = ?',
            )
            .bind(standing, Date.now(), factId)
            .run()
    }

    async registerScene(scene: SceneRecord): Promise<void> {
        await this.db
            .prepare(
                `INSERT INTO scenes (id, episode_num, scene_num, text, status, is_dirty)
         VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .bind(
                scene.id,
                scene.episode_num,
                scene.scene_num,
                scene.text,
                scene.status,
                scene.is_dirty,
            )
            .run()
    }

    async declareDependency(dep: SceneFactDependencyRecord): Promise<void> {
        await this.db
            .prepare(
                `INSERT INTO scene_fact_dependencies (scene_id, fact_id, entity_type, pinned_version)
         VALUES (?, ?, ?, ?)`,
            )
            .bind(
                dep.scene_id,
                dep.fact_id,
                dep.entity_type,
                dep.pinned_version,
            )
            .run()
    }

    async getScene(sceneId: string): Promise<SceneRecord | null> {
        return this.db
            .prepare(
                'SELECT id, episode_num, scene_num, text, status, is_dirty FROM scenes WHERE id = ?',
            )
            .bind(sceneId)
            .first<SceneRecord>()
    }

    async getFactCentralityTelemetry(): Promise<FactCentralityTelemetry[]> {
        const res = await this.db
            .prepare('SELECT * FROM v_fact_centrality_telemetry')
            .all<FactCentralityTelemetry>()
        return res.results || []
    }
}
