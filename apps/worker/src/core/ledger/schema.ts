import type { FactStanding, FactCentralityTelemetry } from './types.js';
import type { D1Database } from '@cloudflare/workers-types';

export class LedgerSchemaManager {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async initializeCoreSchema(migrations: string[]): Promise<void> {
        for (const migration of migrations) {
            await this.db.exec(migration);
        }
    }

    async updateFactVersion(factId: string, newVersion: number): Promise<void> {
        const current = await this.db.prepare('SELECT version FROM facts WHERE id = ?').bind(factId).first<{ version: number }>();
        if (!current) {
            throw new Error('FACT_NOT_FOUND');
        }
        if (newVersion <= current.version) {
            throw new Error(`ILLEGAL_VERSION_MUTATION: newVersion (${newVersion}) must be > current.version (${current.version})`);
        }

        await this.db.prepare('UPDATE facts SET version = ?, updated_at_ms = ? WHERE id = ?')
            .bind(newVersion, Date.now(), factId)
            .run();
    }

    async setFactStanding(factId: string, standing: FactStanding): Promise<void> {
        await this.db.prepare('UPDATE facts SET standing = ?, updated_at_ms = ? WHERE id = ?')
            .bind(standing, Date.now(), factId)
            .run();
    }

    async getFactCentralityTelemetry(): Promise<FactCentralityTelemetry[]> {
        const { results } = await this.db.prepare('SELECT fact_id, scene_dependency_count FROM v_fact_centrality_telemetry').all<FactCentralityTelemetry>();
        return results;
    }
}
