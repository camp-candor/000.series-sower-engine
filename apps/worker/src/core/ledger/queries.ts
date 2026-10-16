// Phase 6: Blast-radius forensics and scene egress readiness.
// Recursive CTE tracer walks from a mutated fact across
// scene_fact_dependencies to identify invalidated downstream scenes.
// Backs the 'sower why-dirty' forensic CLI command and the HTTP 412
// egress precondition gate. Pure 7-bit ASCII telemetry only.

import type { D1Database } from '@cloudflare/workers-types'

export interface InvalidationNode {
    sceneId: string
    episodeNum: number
    sceneNum: number
    factId: string
    pinnedVersion: number
    currentVersion: number
    isDirty: boolean
    depth: number
}

export interface BlastRadiusReport {
    factId: string
    currentVersion: number
    standing: string
    totalScenesImpacted: number
    dirtyScenesCount: number
    affectedEpisodes: number[]
    nodes: InvalidationNode[]
}

export interface SceneEgressCheckResult {
    ready: boolean
    sceneId: string
    status: 'clean' | 'dirty' | 'reviewed'
    isDirty: boolean
    staleDependencies: Array<{
        factId: string
        pinnedVersion: number
        currentVersion: number
    }>
    reason?: string
}

interface BlastRadiusRow {
    scene_id: string
    fact_id: string
    pinned_version: number
    current_version: number
    episode_num: number
    scene_num: number
    is_dirty: number
    depth: number
}

interface DependencyRow {
    fact_id: string
    pinned_version: number
    current_version: number
}

/**
 * Traces forward blast radius from a modified fact across downstream scene
 * dependencies using recursive dependency resolution.
 * Backs the 'sower why-dirty' CLI command.
 */
export async function traceFactBlastRadius(
    db: D1Database,
    factId: string,
): Promise<BlastRadiusReport> {
    const fact = await db
        .prepare('SELECT id, version, standing FROM facts WHERE id = ?')
        .bind(factId)
        .first<{ id: string; version: number; standing: string }>()

    if (!fact) {
        throw new Error(
            `[BLAST_RADIUS_ERROR] Fact not found in CANON_DB: ${factId}`,
        )
    }

    // Recursive CTE query resolving dependent scenes and version discrepancies
    const query = `
    WITH RECURSIVE dependency_chain AS (
      SELECT
        sfd.scene_id,
        sfd.fact_id,
        sfd.pinned_version,
        f.version AS current_version,
        s.episode_num,
        s.scene_num,
        s.is_dirty,
        1 AS depth
      FROM scene_fact_dependencies sfd
      JOIN facts f ON sfd.fact_id = f.id
      JOIN scenes s ON sfd.scene_id = s.id
      WHERE sfd.fact_id = ?
    )
    SELECT * FROM dependency_chain ORDER BY episode_num ASC, scene_num ASC;
  `

    const rows = await db.prepare(query).bind(factId).all<BlastRadiusRow>()
    const results = rows.results ?? []

    const nodes: InvalidationNode[] = results.map((r) => ({
        sceneId: r.scene_id,
        episodeNum: r.episode_num,
        sceneNum: r.scene_num,
        factId: r.fact_id,
        pinnedVersion: r.pinned_version,
        currentVersion: r.current_version,
        isDirty: r.is_dirty === 1,
        depth: r.depth,
    }))

    const episodeSet = new Set<number>()
    let dirtyCount = 0
    for (const n of nodes) {
        episodeSet.add(n.episodeNum)
        if (n.isDirty || n.pinnedVersion < n.currentVersion) {
            dirtyCount += 1
        }
    }

    return {
        factId: fact.id,
        currentVersion: fact.version,
        standing: fact.standing,
        totalScenesImpacted: nodes.length,
        dirtyScenesCount: dirtyCount,
        affectedEpisodes: Array.from(episodeSet).sort((a, b) => a - b),
        nodes,
    }
}

/**
 * Stage 4/5 Precondition Gate: Evaluates whether a scene is certified clean
 * for egress. Flags ready: false when pinned_version < d.current_version
 * or the scene carry the dirty ledger mark.
 */
export async function checkSceneEgressReadiness(
    db: D1Database,
    sceneId: string,
): Promise<SceneEgressCheckResult> {
    const scene = await db
        .prepare('SELECT id, status, is_dirty FROM scenes WHERE id = ?')
        .bind(sceneId)
        .first<{
            id: string
            status: 'clean' | 'dirty' | 'reviewed'
            is_dirty: number
        }>()

    if (!scene) {
        throw new Error(
            `[EGRESS_CHECK_ERROR] Scene not found in CANON_DB: ${sceneId}`,
        )
    }

    const depsQuery = `
    SELECT
      sfd.fact_id,
      sfd.pinned_version,
      f.version AS current_version
    FROM scene_fact_dependencies sfd
    JOIN facts f ON sfd.fact_id = f.id
    WHERE sfd.scene_id = ?
  `

    const rows = await db.prepare(depsQuery).bind(sceneId).all<DependencyRow>()
    const deps = rows.results ?? []

    const stale = deps
        .filter((d) => d.pinned_version < d.current_version)
        .map((d) => ({
            factId: d.fact_id,
            pinnedVersion: d.pinned_version,
            currentVersion: d.current_version,
        }))

    const isDirtyFlag = scene.is_dirty === 1 || scene.status === 'dirty'
    const hasStaleDeps = stale.length > 0

    if (isDirtyFlag || hasStaleDeps) {
        return {
            ready: false,
            sceneId: scene.id,
            status: scene.status,
            isDirty: isDirtyFlag,
            staleDependencies: stale,
            reason: isDirtyFlag
                ? 'Scene marked dirty in ledger'
                : `Scene contains ${stale.length} stale fact dependency pins`,
        }
    }

    return {
        ready: true,
        sceneId: scene.id,
        status: scene.status,
        isDirty: false,
        staleDependencies: [],
    }
}
