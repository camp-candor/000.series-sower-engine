import type { D1Database } from '@cloudflare/workers-types';
import type { FactStanding, FactRecord } from './types.js';

export class LedgerSchemaManager {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async initializeCoreSchema(): Promise<void> {
        // Provided primarily as a namespace indicator.
        // D1 migrations are usually run out of band via Wrangler.
    }

    async updateFactVersion(factId: string, newVersion: number): Promise<void> {
        const current = await this.db
            .prepare(`SELECT version FROM facts WHERE id = ?`)
            .bind(factId)
            .first<Pick<FactRecord, 'version'>>();

        if (!current) {
            throw new Error(`Fact not found: ${factId}`);
        }

        if (newVersion <= current.version) {
            throw new Error('ILLEGAL_VERSION_MUTATION: new version must be monotonically greater');
        }

        await this.db
            .prepare(`UPDATE facts SET version = ?, updated_at_ms = ? WHERE id = ?`)
            .bind(newVersion, Date.now(), factId)
            .run();
    }

    async setFactStanding(factId: string, standing: FactStanding): Promise<void> {
        await this.db
            .prepare(`UPDATE facts SET standing = ?, updated_at_ms = ? WHERE id = ?`)
            .bind(standing, Date.now(), factId)
            .run();
    }
}
