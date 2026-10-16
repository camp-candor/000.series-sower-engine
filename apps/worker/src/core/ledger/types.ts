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
    dependency_count: number;
}

export interface EventLogRecord {
    id: string;
    type: string;
    payload: string;
    created_at_ms: number;
}

export interface EntitiesLiveRecord {
    id: string;
    type: string;
    status: string;
    updated_at_ms: number;
}

export interface StringsLedgerRecord {
    id: string;
    key: string;
    value: string;
    updated_at_ms: number;
}

export interface GrievanceStatusRecord {
    holder_id: string;
    debtor_id: string;
    status: string;
    updated_at_ms: number;
}

export interface ParanoiaClocksRecord {
    entity_id: string;
    meter_value: number; // 0 to 10000 (basis points)
    updated_at_ms: number;
}
