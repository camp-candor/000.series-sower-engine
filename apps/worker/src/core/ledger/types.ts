export type FactScope = 'CHARACTER' | 'LOCATION' | 'LOGISTIC' | 'LAW'
export type FactAuthorityLevel =
    'AXIOM' | 'CANON' | 'EVENT' | 'RUNTIME_STATE' | 'PROJECTION' | 'SPECULATION'
export type FactStanding =
    'ACTIVE_ENDORSED' | 'FLAGGED_FOR_REVIEW' | 'DEPRECATED_ARCHIVED'

export interface FactRecord {
    id: string
    claim_text: string
    scope: FactScope
    authority_level: FactAuthorityLevel
    standing: FactStanding
    author: string
    timestamp_ms: number
    version: number
}

export interface SceneRecord {
    id: string
    episode_num: number
    scene_num: number
    text: string
    status: 'clean' | 'dirty' | 'reviewed'
    is_dirty: number
}

export interface SceneFactDependencyRecord {
    scene_id: string
    fact_id: string
    entity_type: 'character' | 'location' | 'possession' | 'grievance' | 'axiom'
    pinned_version: number
}

export interface FactCentralityTelemetry {
    fact_id: string
    scope?: FactScope
    current_version?: number
    standing?: FactStanding
    dependent_scenes_count?: number
    scene_dependency_count?: number
}
