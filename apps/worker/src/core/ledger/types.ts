export type FactScope = 'CHARACTER' | 'LOCATION' | 'LOGISTIC' | 'LAW';
export type FactStanding = 'GOOD' | 'FLAGGED_FOR_REVIEW' | 'DEPRECATED_ARCHIVED';

export interface FactRecord {
    id: string;
    scope: FactScope;
    standing: FactStanding;
    version: number;
    created_at_ms: number;
    updated_at_ms: number;
}

export interface SceneRecord {
    id: string;
    is_dirty: number;
    created_at_ms: number;
    updated_at_ms: number;
}

export interface SceneFactDependencyRecord {
    scene_id: string;
    fact_id: string;
    pinned_version: number;
}

export interface FactCentralityTelemetry {
    fact_id: string;
    scene_dependency_count: number;
}
