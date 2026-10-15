import { DurableObject } from 'cloudflare:workers';

export interface SowerSessionEnv {
  CANON_DB: D1Database;
  SOWER_SESSION: DurableObjectNamespace;
}

export interface StagedSimulationDelta {
  cycleId: string;
  timestamp: number;
  deltaPayload: Record<string, unknown>;
  verified: boolean;
}

export class SowerSessionDO extends DurableObject {
  private stateMutexLocked: boolean = false;
  private volatileStagingBuffer: StagedSimulationDelta[] = [];
  private currentEpoch: number = 0;

  constructor(ctx: DurableObjectState, env: SowerSessionEnv) {
    super(ctx, env);
  }

  async acquireMutex(_callerId: string): Promise<{ acquired: boolean; epoch: number }> {
    if (this.stateMutexLocked) {
      return { acquired: false, epoch: this.currentEpoch };
    }
    this.stateMutexLocked = true;
    this.currentEpoch += 1;
    return { acquired: true, epoch: this.currentEpoch };
  }

  async releaseMutex(epoch: number): Promise<boolean> {
    if (this.stateMutexLocked && epoch === this.currentEpoch) {
      this.stateMutexLocked = false;
      return true;
    }
    return false;
  }

  async stageDelta(delta: StagedSimulationDelta): Promise<{ staged: boolean; bufferLength: number }> {
    if (!this.stateMutexLocked) {
      throw new Error('ILLEGAL_MUTATION: Cannot stage delta without holding session state mutex');
    }
    this.volatileStagingBuffer.push(delta);
    return { staged: true, bufferLength: this.volatileStagingBuffer.length };
  }

  async discardStaging(): Promise<{ discarded: number }> {
    const count = this.volatileStagingBuffer.length;
    this.volatileStagingBuffer = [];
    return { discarded: count };
  }

  async drainStaging(): Promise<StagedSimulationDelta[]> {
    const drained = [...this.volatileStagingBuffer];
    this.volatileStagingBuffer = [];
    return drained;
  }

  async getStatus(): Promise<{ locked: boolean; epoch: number; bufferCount: number }> {
    return {
      locked: this.stateMutexLocked,
      epoch: this.currentEpoch,
      bufferCount: this.volatileStagingBuffer.length,
    };
  }
}
