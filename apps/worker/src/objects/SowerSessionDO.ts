import { DurableObject } from 'cloudflare:workers'

export interface SowerSessionEnv {
  CANON_DB: D1Database
  SOWER_SESSION: DurableObjectNamespace
}

export interface StagedSimulationDelta {
  cycleId: string
  timestamp_ms: number
  deltaPayload: Record<string, unknown>
  verified: boolean
}

export class SowerSessionDO extends DurableObject {
  private stateMutexLocked: boolean = false
  private volatileStagingBuffer: StagedSimulationDelta[] = []
  private currentEpoch: number = 0
  private activeHolderId: string | null = null

  constructor(ctx: DurableObjectState, env: SowerSessionEnv) {
    super(ctx, env)
  }

  async acquireMutex(callerId: string): Promise<{ acquired: boolean; epoch: number }> {
    if (this.stateMutexLocked) {
      return { acquired: false, epoch: this.currentEpoch }
    }
    this.stateMutexLocked = true
    this.currentEpoch += 1
    this.activeHolderId = callerId
    return { acquired: true, epoch: this.currentEpoch }
  }

  async releaseMutex(epoch: number): Promise<{ released: boolean; epoch: number }> {
    if (this.stateMutexLocked && epoch === this.currentEpoch) {
      this.stateMutexLocked = false
      this.activeHolderId = null
      return { released: true, epoch: this.currentEpoch }
    }
    return { released: false, epoch: this.currentEpoch }
  }

  async stageDelta(
    delta: StagedSimulationDelta,
    epoch: number,
  ): Promise<{ staged: boolean; bufferLength: number }> {
    if (!this.stateMutexLocked) {
      throw new Error('[ILLEGAL_MUTATION] Must hold state mutex to stage deltas')
    }
    if (epoch !== this.currentEpoch) {
      throw new Error(`[STALE_EPOCH_ZOMBIE] Presented ${epoch}, Active ${this.currentEpoch}`)
    }
    this.volatileStagingBuffer.push(delta)
    return { staged: true, bufferLength: this.volatileStagingBuffer.length }
  }

  async discardStaging(epoch: number): Promise<{ discarded: number }> {
    if (epoch !== this.currentEpoch) {
      throw new Error(`[STALE_EPOCH_ZOMBIE] Presented ${epoch}, Active ${this.currentEpoch}`)
    }
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
    holderId: string | null
  }> {
    return {
      locked: this.stateMutexLocked,
      epoch: this.currentEpoch,
      bufferCount: this.volatileStagingBuffer.length,
      holderId: this.activeHolderId,
    }
  }
}
