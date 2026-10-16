import { DurableObject } from 'cloudflare:workers'
import type { EventEnvelope } from '../core/ledger/events.js'
import {
    createInitialLedgerState,
    type LedgerState,
} from '../core/ledger/reducer.js'
import { StagingAccumulator } from '../core/ledger/stagingAccumulator.js'

export const HOT_BUFFER_FLUSH_THRESHOLD = 1000

export interface SowerSessionEnv {
    CANON_DB: D1Database
    SOWER_SESSION: DurableObjectNamespace
}

export interface StagedSimulationDelta {
    cycleId: string
    timestamp: number
    deltaPayload: Record<string, unknown>
    verified: boolean
}

export class SowerSessionDO extends DurableObject {
    private stateMutexLocked: boolean = false
    private volatileStagingBuffer: StagedSimulationDelta[] = []
    private currentEpoch: number = 0
    private readonly sowerEnv: SowerSessionEnv
    private ledgerAccumulator: StagingAccumulator | null = null

    constructor(ctx: DurableObjectState, env: SowerSessionEnv) {
        super(ctx, env)
        this.sowerEnv = env
    }

    private ensureAccumulator(): StagingAccumulator {
        if (!this.ledgerAccumulator) {
            this.ledgerAccumulator = new StagingAccumulator(
                createInitialLedgerState(),
            )
        }
        return this.ledgerAccumulator
    }

    async stageLedgerEvent(
        envelope: EventEnvelope,
    ): Promise<{ staged: boolean; hotBufferCount: number; flushed: number }> {
        const accumulator = this.ensureAccumulator()
        accumulator.stageEvent(envelope)
        let flushed = 0
        if (accumulator.getStagedCount() >= HOT_BUFFER_FLUSH_THRESHOLD) {
            flushed = (await this.flushHotBufferToD1()).flushed
        }
        return {
            staged: true,
            hotBufferCount: accumulator.getStagedCount(),
            flushed,
        }
    }

    async flushHotBufferToD1(): Promise<{ flushed: number }> {
        const accumulator = this.ensureAccumulator()
        const count = accumulator.getStagedCount()
        if (count === 0) {
            return { flushed: 0 }
        }
        const statements = accumulator.compileD1BatchStatements(
            this.sowerEnv.CANON_DB,
        )
        if (statements.length > 0) {
            await this.sowerEnv.CANON_DB.batch(statements)
        }
        accumulator.commit()
        return { flushed: count }
    }

    async rollbackHotBuffer(): Promise<{ discarded: number }> {
        const accumulator = this.ensureAccumulator()
        const discarded = accumulator.getStagedCount()
        accumulator.rollback()
        return { discarded }
    }

    async getLedgerState(): Promise<LedgerState> {
        return this.ensureAccumulator().getWorkingState()
    }

    async acquireMutex(
        _callerId: string,
    ): Promise<{ acquired: boolean; epoch: number }> {
        if (this.stateMutexLocked) {
            return { acquired: false, epoch: this.currentEpoch }
        }
        this.stateMutexLocked = true
        this.currentEpoch += 1
        return { acquired: true, epoch: this.currentEpoch }
    }

    async releaseMutex(epoch: number): Promise<boolean> {
        if (this.stateMutexLocked && epoch === this.currentEpoch) {
            this.stateMutexLocked = false
            return true
        }
        return false
    }

    async stageDelta(
        delta: StagedSimulationDelta,
    ): Promise<{ staged: boolean; bufferLength: number }> {
        if (!this.stateMutexLocked) {
            throw new Error(
                'ILLEGAL_MUTATION: Cannot stage delta without holding session state mutex',
            )
        }
        this.volatileStagingBuffer.push(delta)
        return { staged: true, bufferLength: this.volatileStagingBuffer.length }
    }

    async discardStaging(): Promise<{ discarded: number }> {
        const count = this.volatileStagingBuffer.length
        this.volatileStagingBuffer = []
        return { discarded: count }
    }

    async drainStaging(): Promise<StagedSimulationDelta[]> {
        const drained = [...this.volatileStagingBuffer]
        this.volatileStagingBuffer = []
        return drained
    }

    async getStatus(): Promise<{
        locked: boolean
        epoch: number
        bufferCount: number
        hotBufferCount: number
    }> {
        return {
            locked: this.stateMutexLocked,
            epoch: this.currentEpoch,
            bufferCount: this.volatileStagingBuffer.length,
            hotBufferCount: this.ledgerAccumulator
                ? this.ledgerAccumulator.getStagedCount()
                : 0,
        }
    }
}
