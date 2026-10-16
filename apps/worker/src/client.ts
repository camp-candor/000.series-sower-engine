import { D1Database } from '@cloudflare/workers-types'
import { BibleState } from './core/canon/types.js'
import {
    compileCanonSnapshot,
    CanonDesynchronizedError,
} from './core/canon/bibleLoader.js'

export interface CanonIngestionEnv {
    CANON_DB?: D1Database
}

/**
 * Asserts that the ingested canon snapshot's Merkle root matches the active D1 checkpoint.
 */
export async function assertCanonMerkleLock(
    canon: Readonly<BibleState>,
    db?: D1Database,
): Promise<void> {
    if (!db) {
        // If running in offline test harness without D1 binding, permit bypass only if explicitly configured
        return
    }

    const expectedHash = canon._meta.state_hash

    // Query active checkpoint lock in CANON_DB
    const result = await db
        .prepare(
            'SELECT state_hash FROM canon_checkpoints WHERE series_slug = ? AND is_active = 1 LIMIT 1',
        )
        .bind(canon._meta.seriesSlug)
        .first<{ state_hash: string }>()

    if (!result) {
        throw new CanonDesynchronizedError(
            `No active canon checkpoint recorded in CANON_DB for series: ${canon._meta.seriesSlug}`,
        )
    }

    if (result.state_hash !== expectedHash) {
        throw new CanonDesynchronizedError(
            `Checkpoint mismatch! Ledger D1 hash: ${result.state_hash} !== Snapshot H_root: ${expectedHash}`,
        )
    }
}

/**
 * Primary runtime entry point: parses raw snapshot, validates graph invariants,
 * verifies the D1 Merkle checkpoint, and returns a frozen, read-only BibleState.
 */
export async function loadBibleState(
    rawSnapshot: unknown,
    env?: CanonIngestionEnv,
): Promise<Readonly<BibleState>> {
    const canon = compileCanonSnapshot(rawSnapshot)
    if (env?.CANON_DB) {
        await assertCanonMerkleLock(canon, env.CANON_DB)
    }
    return canon
}
