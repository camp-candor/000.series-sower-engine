// Phase 6: Append-only errata and state-delta packaging.
// Rendered broadcast masters are immutable. Permanent world
// transformations (character death, somatic severing) and canon errata
// compile into conformed state_delta envelopes staged for human
// Showrunner ratification, never silent in-place mutation of history.
// Pure 7-bit ASCII telemetry only.

export interface StateDeltaRecord {
    deltaId: string
    sourceCycleId: string
    seriesSlug: string
    timestamp_ms: number
    entityMutations: Array<{
        entityId: string
        entityType: 'CHARACTER' | 'LOCATION' | 'OBJECT'
        mutationType:
            'STATUS_TRANSITION' | 'SOMATIC_SEVER' | 'INVENTORY_REALLOCATION'
        before: Record<string, unknown>
        after: Record<string, unknown>
    }>
    supersededFacts: Array<{
        factId: string
        oldVersion: number
        newVersion: number
        retireReason: string
    }>
    showrunnerRatified: boolean
}

export interface ErrataEntry {
    errataId: string
    episodeId: string
    sceneId: string
    timestamp_ms: number
    supersededFactId: string
    remedialFactId: string
    remasterStrategy:
        'FROZEN_HISTORICAL_RECORD' | 'RENDER_NEW_CONTENT_ADDRESSED_MASTER'
}

/**
 * Compiles a conformed state_delta envelope for Showrunner review.
 * The record ships unratified; promotion requires explicit human sign-off.
 */
export function compileStateDeltaPayload(
    seriesSlug: string,
    sourceCycleId: string,
    mutations: StateDeltaRecord['entityMutations'],
    supersededFacts: StateDeltaRecord['supersededFacts'],
): StateDeltaRecord {
    return {
        deltaId: `delta_${seriesSlug}_${Date.now()}`,
        sourceCycleId,
        seriesSlug,
        timestamp_ms: Date.now(),
        entityMutations: mutations,
        supersededFacts,
        showrunnerRatified: false,
    }
}

/**
 * Builds an append-only historical errata entry. The default strategy
 * freezes the historical record; remastering renders a new
 * content-addressed master without overwriting the original.
 */
export function buildHistoricalErrataEntry(
    episodeId: string,
    sceneId: string,
    supersededFactId: string,
    remedialFactId: string,
    remasterStrategy: ErrataEntry['remasterStrategy'] = 'FROZEN_HISTORICAL_RECORD',
): ErrataEntry {
    return {
        errataId: `errata_${episodeId}_${sceneId}_${Date.now()}`,
        episodeId,
        sceneId,
        timestamp_ms: Date.now(),
        supersededFactId,
        remedialFactId,
        remasterStrategy,
    }
}
