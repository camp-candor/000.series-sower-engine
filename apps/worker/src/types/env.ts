import type { EdgeSpatialProofQuadruple } from './spatial.js'

import type { EdgeSpatialProofQuadruple } from './spatial.js'

export interface Env {
    SOWER_SESSION: DurableObjectNamespace
    CANON_DB?: D1Database
    ENVIRONMENT?: string
    GATEWAY_SECRET?: string
}

export interface EdgeBootRequestPayload {
    seriesSlug: string
    bibleState: Record<string, any>
    timestampMs?: number
}

export interface EdgeBootResponseReceipt {
    status: 'READY' | 'ERROR'
    seriesSlug: string
    headSequence: number
    stateHash: string
    entitiesCount: number
    bootedAtMs: number
    storageBackend: 'DO_SQLITE'
    spatialProofSchemaActive: boolean
    spatialProofSchemaActive: boolean
}

export interface EdgeSpatialEventRecord {
    sequenceNumber: number
    eventId: string
    tick: number
    eventType: string
    actorId?: string
    payloadJson: string
    proof: EdgeSpatialProofQuadruple
    timestampMs: number
}

export interface EdgeSpatialEventRecord {
    sequenceNumber: number
    eventId: string
    tick: number
    eventType: string
    actorId?: string
    payloadJson: string
    proof: EdgeSpatialProofQuadruple
    timestampMs: number
}
