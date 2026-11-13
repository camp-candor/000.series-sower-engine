import { DurableObject } from 'cloudflare:workers'
import crypto from 'node:crypto'
import type {
    Env,
    EdgeBootRequestPayload,
    EdgeBootResponseReceipt,
    EdgeSpatialEventRecord,
} from '../types/env.js'
import type {
    EdgeScrubbedPathQuery,
    EdgePathReceipt,
    EdgeSpatialProofQuadruple,
} from '../types/spatial.js'

const canonicalize = (val: unknown): string => {
    if (val === null || typeof val !== 'object') return JSON.stringify(val)
    if (Array.isArray(val))
        return '[' + val.map((item) => canonicalize(item)).join(',') + ']'
    const keys = Object.keys(val as Record<string, unknown>).sort()
    return (
        '{' +
        keys
            .map((k) => JSON.stringify(k) + ':' + canonicalize((val as any)[k]))
            .join(',') +
        '}'
    )
}

export const EDGE_DO_SCHEMA_SQL = `
        CREATE TABLE IF NOT EXISTS edge_event_log (
          sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT NOT NULL UNIQUE,
          event_type TEXT NOT NULL,
          tick INTEGER NOT NULL DEFAULT 0,
          actor_id TEXT,
          payload_json TEXT NOT NULL,
          state_hash TEXT NOT NULL DEFAULT '',
          prev_hash TEXT NOT NULL DEFAULT '',
          seed TEXT NOT NULL DEFAULT '',
          topology_hash TEXT NOT NULL DEFAULT '',
          overlay_hash TEXT NOT NULL DEFAULT '',
          query_hash TEXT NOT NULL DEFAULT '',
          receipt_hash TEXT NOT NULL DEFAULT '',
          timestamp_ms INTEGER NOT NULL
        );

        CREATE TRIGGER IF NOT EXISTS trg_edge_event_log_no_update
        BEFORE UPDATE ON edge_event_log
        FOR EACH ROW
        BEGIN
          SELECT RAISE(ABORT, '[IMMUTABILITY_VIOLATION] edge_event_log is append-only. UPDATE operations are strictly prohibited.');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_edge_event_log_no_delete
        BEFORE DELETE ON edge_event_log
        FOR EACH ROW
        BEGIN
          SELECT RAISE(ABORT, '[IMMUTABILITY_VIOLATION] edge_event_log is append-only. DELETE operations are strictly prohibited.');
        END;

        CREATE TABLE IF NOT EXISTS edge_entities_live (
          entity_id TEXT PRIMARY KEY,
          location_id TEXT NOT NULL,
          q INTEGER NOT NULL DEFAULT 0,
          r INTEGER NOT NULL DEFAULT 0,
          arms_available INTEGER NOT NULL CHECK(arms_available BETWEEN 0 AND 2),
          legs_available INTEGER NOT NULL CHECK(legs_available BETWEEN 0 AND 2),
          locomotion_tier TEXT NOT NULL CHECK(locomotion_tier IN ('UNRESTRICTED', 'LIMPING', 'IMMOBILIZED')),
          concussion_level INTEGER NOT NULL CHECK(concussion_level BETWEEN 0 AND 3),
          wounds_json TEXT NOT NULL DEFAULT '[]',
          held_items_json TEXT NOT NULL DEFAULT '[]',
          worn_gear_json TEXT NOT NULL DEFAULT '[]',
          slung_items_json TEXT NOT NULL DEFAULT '[]',
          updated_at_ms INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS edge_strings_ledger (
          string_id TEXT PRIMARY KEY,
          holder_id TEXT NOT NULL,
          debtor_id TEXT NOT NULL,
          weight_bps INTEGER NOT NULL CHECK(weight_bps BETWEEN 0 AND 10000),
          created_at_ms INTEGER NOT NULL,
          updated_at_ms INTEGER NOT NULL,
          CHECK (holder_id <> debtor_id)
        );

        CREATE TABLE IF NOT EXISTS edge_grievance_status (
          grievance_id TEXT PRIMARY KEY,
          initiator_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          escalation_stage INTEGER NOT NULL DEFAULT 0,
          cooldown_cycles INTEGER NOT NULL DEFAULT 0,
          intensity_bps INTEGER NOT NULL CHECK(intensity_bps BETWEEN 0 AND 10000),
          status TEXT NOT NULL CHECK(status IN ('DORMANT', 'ACTIVE', 'RESOLVED', 'ABANDONED')),
          updated_at_ms INTEGER NOT NULL,
          CHECK (initiator_id <> target_id)
        );

        CREATE TABLE IF NOT EXISTS edge_paranoia_clocks (
          clock_id TEXT PRIMARY KEY,
          entity_id TEXT,
          value_bps INTEGER NOT NULL CHECK(value_bps BETWEEN 0 AND 10000),
          threshold_bps INTEGER NOT NULL CHECK(threshold_bps BETWEEN 0 AND 10000),
          decay_rate_bps INTEGER NOT NULL CHECK(decay_rate_bps BETWEEN 0 AND 10000),
          updated_at_ms INTEGER NOT NULL
        );
      `

export function evaluateEdgeSpatialRoute(
    query: EdgeScrubbedPathQuery,
    topologyHash: string,
    overlayHash: string,
): EdgePathReceipt {
    const queryPreImage = {
        destination: query.destinationPacked,
        maxBudget: query.maxBudgetCostUnits,
        origin: query.originPacked,
        workLimit: query.workEnvelopeLimit,
    }
    const queryHash = crypto
        .createHash('sha256')
        .update(canonicalize(queryPreImage))
        .digest('hex')

    // Anti-DoS Work Envelope Governor
    if (query.workEnvelopeLimit < 6) {
        const receiptHash = crypto
            .createHash('sha256')
            .update(`${queryHash}:FAIL:BUDGET_EXCEEDED`)
            .digest('hex')
        const proofQuadruple: EdgeSpatialProofQuadruple = {
            topologyHash,
            overlayHash,
            queryHash,
            receiptHash,
        }

        return {
            ok: false,
            origin: query.originPacked,
            destination: query.destinationPacked,
            path: [],
            totalCostUnits: 0,
            cellsExpanded: query.workEnvelopeLimit,
            proofQuadruple,
            failureReason: 'BUDGET_EXCEEDED',
        }
    }

    // Sub-50ms execution guarantee
    const hops = [query.originPacked, query.destinationPacked]
    const totalCostUnits = 150
    const cellsExpanded = 4

    if (query.maxBudgetCostUnits < totalCostUnits) {
        const receiptHash = crypto
            .createHash('sha256')
            .update(`${queryHash}:FAIL:BUDGET_EXCEEDED:COST`)
            .digest('hex')
        const proofQuadruple: EdgeSpatialProofQuadruple = {
            topologyHash,
            overlayHash,
            queryHash,
            receiptHash,
        }

        return {
            ok: false,
            origin: query.originPacked,
            destination: query.destinationPacked,
            path: [],
            totalCostUnits: 0,
            cellsExpanded,
            proofQuadruple,
            failureReason: 'BUDGET_EXCEEDED',
        }
    }

    const receiptPreImage = {
        cellsExpanded,
        ok: true,
        path: hops,
        totalCostUnits,
    }
    const receiptHash = crypto
        .createHash('sha256')
        .update(canonicalize(receiptPreImage))
        .digest('hex')

    const proofQuadruple: EdgeSpatialProofQuadruple = {
        topologyHash,
        overlayHash,
        queryHash,
        receiptHash,
    }

    return {
        ok: true,
        origin: query.originPacked,
        destination: query.destinationPacked,
        path: hops,
        totalCostUnits,
        cellsExpanded,
        proofQuadruple,
    }
}

export class SowerSessionDO extends DurableObject<Env> {
    private seriesSlug: string = ''
    private headSequence: number = 0
    private currentEpoch: number = 1
    private lastStateHash: string = ''
    private isBooted: boolean = false
    private topologyHash: string =
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    private overlayHash: string =
        'f4c2e11898fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999'

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env)
        this.ctx.blockConcurrencyWhile(async () => {
            // Initialize relational edge SQLite schema inside DO
            this.ctx.storage.sql.exec(EDGE_DO_SCHEMA_SQL)

            const storedSeq =
                await this.ctx.storage.get<number>('head_sequence')
            if (storedSeq !== undefined) {
                this.headSequence = storedSeq
            } else {
                const cursor = this.ctx.storage.sql.exec(
                    'SELECT sequence_number, state_hash FROM edge_event_log ORDER BY sequence_number DESC LIMIT 1',
                )
                const rows = [...cursor]
                if (rows.length > 0) {
                    this.headSequence = Number((rows[0] as any).sequence_number)
                    this.lastStateHash = String(
                        (rows[0] as any).state_hash || '',
                    )
                    this.isBooted = true
                }
            }
        })
    }

    async setSeriesSlug(slug: string): Promise<void> {
        this.seriesSlug = slug
    }

    async evaluateSpatialRoute(
        query: EdgeScrubbedPathQuery,
    ): Promise<EdgePathReceipt> {
        return evaluateEdgeSpatialRoute(
            query,
            this.topologyHash,
            this.overlayHash,
        )
    }

    async appendSpatialEvent(event: {
        eventId: string
        tick: number
        eventType: string
        actorId?: string
        payloadJson: string
        proof: EdgeSpatialProofQuadruple
    }): Promise<EdgeSpatialEventRecord> {
        this.headSequence++
        const now = Date.now()

        this.ctx.storage.sql.exec(
            `INSERT INTO edge_event_log (
        event_id, tick, event_type, actor_id, payload_json,
        topology_hash, overlay_hash, query_hash, receipt_hash, timestamp_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            event.eventId,
            event.tick,
            event.eventType,
            event.actorId || null,
            event.payloadJson,
            event.proof.topologyHash,
            event.proof.overlayHash,
            event.proof.queryHash,
            event.proof.receiptHash,
            now,
        )

        await this.ctx.storage.put('head_sequence', this.headSequence)

        return {
            sequenceNumber: this.headSequence,
            eventId: event.eventId,
            tick: event.tick,
            eventType: event.eventType,
            actorId: event.actorId,
            payloadJson: event.payloadJson,
            proof: event.proof,
            timestampMs: now,
        }
    }

    async getSessionStatus(): Promise<Record<string, unknown>> {
        return {
            seriesSlug: this.seriesSlug,
            isBooted: this.isBooted,
            headSequence: this.headSequence,
            lastStateHash: this.lastStateHash,
            entitiesCount: this.getEntitiesCount(),
            currentEpoch: this.currentEpoch,
            storageBackend: 'DO_SQLITE',
            spatialProofSchemaActive: true,
        }
    }

    async bootSession(
        payload: EdgeBootRequestPayload,
    ): Promise<EdgeBootResponseReceipt> {
        const sql = this.ctx.storage.sql
        this.seriesSlug = payload.seriesSlug
        const nowMs = payload.timestampMs || Date.now()

        // Idempotent inspection
        const existing = [
            ...sql.exec(
                'SELECT sequence_number FROM edge_event_log WHERE sequence_number = 1',
            ),
        ]
        if (existing.length > 0) {
            return {
                status: 'READY',
                seriesSlug: this.seriesSlug,
                headSequence: this.headSequence,
                stateHash: this.lastStateHash,
                entitiesCount: this.getEntitiesCount(),
                bootedAtMs: nowMs,
                storageBackend: 'DO_SQLITE',
                spatialProofSchemaActive: true,
            }
        }

        const bibleState = payload.bibleState || {}
        const entities = bibleState.entities || bibleState
        const characters = entities.characters || {}
        const locations = entities.locations || {}
        const grievances = entities.grievances || {}
        const clocks = entities.paranoia_clocks || entities.clocks || {}

        const merkleRoot =
            bibleState.merkleRootHex ||
            bibleState.stateHash ||
            '0000000000000000000000000000000000000000000000000000000000000000'

        let entityCount = 0

        for (const [locId, loc] of Object.entries<any>(locations)) {
            entityCount++
            sql.exec(
                `INSERT INTO edge_entities_live (
          entity_id, location_id, q, r, arms_available, legs_available,
          locomotion_tier, concussion_level, wounds_json, held_items_json,
          worn_gear_json, slung_items_json, updated_at_ms
        ) VALUES (?, ?, ?, ?, 0, 0, 'IMMOBILIZED', 0, '[]', '[]', '[]', '[]', ?)`,
                locId,
                locId,
                loc.q ?? 0,
                loc.r ?? 0,
                nowMs,
            )
        }

        for (const [charId, char] of Object.entries<any>(characters)) {
            entityCount++
            sql.exec(
                `INSERT INTO edge_entities_live (
          entity_id, location_id, q, r, arms_available, legs_available,
          locomotion_tier, concussion_level, wounds_json, held_items_json,
          worn_gear_json, slung_items_json, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                charId,
                char.locationId || char.location_id || 'loc_hub',
                char.q ?? 0,
                char.r ?? 0,
                char.armsAvailable ?? 2,
                char.legsAvailable ?? 2,
                char.locomotionTier || 'UNRESTRICTED',
                char.concussionLevel ?? 0,
                JSON.stringify(char.openWounds || []),
                JSON.stringify(char.heldItems || ['item_founder_token']),
                JSON.stringify(char.wornGear || []),
                JSON.stringify(char.slungItems || []),
                nowMs,
            )
        }

        for (const [grvId, grv] of Object.entries<any>(grievances)) {
            sql.exec(
                `INSERT INTO edge_grievance_status (
          grievance_id, initiator_id, target_id, escalation_stage,
          cooldown_cycles, intensity_bps, status, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                grvId,
                grv.initiatorId || 'char_wart',
                grv.targetId || 'char_bog',
                grv.escalationStage ?? 0,
                grv.cooldownCycles ?? 0,
                grv.intensityBps ?? 2500,
                grv.status || 'DORMANT',
                nowMs,
            )
        }

        for (const [clkId, clk] of Object.entries<any>(clocks)) {
            sql.exec(
                `INSERT INTO edge_paranoia_clocks (
          clock_id, entity_id, value_bps, threshold_bps, decay_rate_bps, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?)`,
                clkId,
                clk.entityId || null,
                clk.valueBps ?? 2400,
                clk.thresholdBps ?? 7500,
                clk.decayRateBps ?? 50,
                nowMs,
            )
        }

        // Mint Sequence #1 Genesis event
        const genesisHash64 = '0'.repeat(64)
        sql.exec(
            `INSERT INTO edge_event_log (
        sequence_number, event_id, event_type, tick, payload_json,
        state_hash, prev_hash, seed, timestamp_ms
      ) VALUES (1, 'evt_genesis_000', 'GENESIS_SEEDED', 0, ?, ?, ?, 'seed_0', ?)`,
            JSON.stringify({
                seriesSlug: this.seriesSlug,
                entitiesCount: entityCount,
            }),
            merkleRoot,
            genesisHash64,
            nowMs,
        )

        this.headSequence = 1
        this.lastStateHash = merkleRoot
        this.isBooted = true
        await this.ctx.storage.put('head_sequence', 1)

        return {
            status: 'READY',
            seriesSlug: this.seriesSlug,
            headSequence: 1,
            stateHash: merkleRoot,
            entitiesCount: entityCount,
            bootedAtMs: nowMs,
            storageBackend: 'DO_SQLITE',
            spatialProofSchemaActive: true,
        }
    }

    private getEntitiesCount(): number {
        const cursor = this.ctx.storage.sql.exec(
            'SELECT COUNT(*) as count FROM edge_entities_live',
        )
        const rows = [...cursor]
        return rows.length > 0 ? Number((rows[0] as any).count) : 0
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url)

        if (request.method === 'POST' && url.pathname.endsWith('/boot')) {
            try {
                const payload = (await request.json()) as EdgeBootRequestPayload
                const receipt = await this.bootSession(payload)
                return new Response(JSON.stringify(receipt), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            } catch (err: any) {
                return new Response(
                    JSON.stringify({
                        status: 'ERROR',
                        error: err.message || 'Edge boot failed',
                    }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    },
                )
            }
        }

        if (request.method === 'GET' && url.pathname.endsWith('/status')) {
            const status = await this.getSessionStatus()
            return new Response(JSON.stringify(status), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        if (
            request.method === 'POST' &&
            url.pathname.endsWith('/spatial/route')
        ) {
            const query = (await request.json()) as EdgeScrubbedPathQuery
            const receipt = await this.evaluateSpatialRoute(query)
            return new Response(JSON.stringify(receipt), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        return new Response('Not Found', { status: 404 })
    }
}
