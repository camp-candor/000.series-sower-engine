import { describe, it, expect } from 'vitest'
import { SowerSessionDO } from '../../src/objects/SowerSessionDO.js'

describe('SowerSessionDO In-Memory State Mutex & Epoch Gauntlet', () => {
  const createMockDO = () => {
    const mockCtx = {} as any
    const mockEnv = {
      CANON_DB: {} as any,
      SOWER_SESSION: {} as any,
    }
    const doInstance = Object.create(SowerSessionDO.prototype)
    doInstance.stateMutexLocked = false
    doInstance.volatileStagingBuffer = []
    doInstance.currentEpoch = 0
    doInstance.activeHolderId = null
    Object.assign(doInstance, { ctx: mockCtx, env: mockEnv })
    return doInstance
  }

  it('should acquire mutex, increment epoch to 1, and report locked status', async () => {
    const session = createMockDO()

    const acquireResult = await session.acquireMutex('actor-conductor-01')
    expect(acquireResult.acquired).toBe(true)
    expect(acquireResult.epoch).toBe(1)

    const status = await session.getStatus()
    expect(status.locked).toBe(true)
    expect(status.epoch).toBe(1)
    expect(status.holderId).toBe('actor-conductor-01')
  })

  it('should reject concurrent acquire while mutex is held', async () => {
    const session = createMockDO()
    await session.acquireMutex('actor-conductor-01')

    const secondAcquire = await session.acquireMutex('actor-conductor-02')
    expect(secondAcquire.acquired).toBe(false)
    expect(secondAcquire.epoch).toBe(1)
  })

  it('should advance epoch monotonically on subsequent acquisitions', async () => {
    const session = createMockDO()

    const first = await session.acquireMutex('caller-1')
    expect(first.epoch).toBe(1)
    await session.releaseMutex(first.epoch)

    const second = await session.acquireMutex('caller-2')
    expect(second.epoch).toBe(2)
  })

  it('should stage deltas only when active mutex and matching epoch are presented', async () => {
    const session = createMockDO()
    const { epoch } = await session.acquireMutex('caller-1')

    const delta = {
      cycleId: 'cycle-001',
      timestamp_ms: 1729000000000,
      deltaPayload: { fact: 'silas_hand_injured', val: 1 },
      verified: true,
    }

    const staged = await session.stageDelta(delta, epoch)
    expect(staged.staged).toBe(true)
    expect(staged.bufferLength).toBe(1)

    // Reject stale epoch
    await expect(session.stageDelta(delta, epoch - 1)).rejects.toThrow('STALE_EPOCH_ZOMBIE')
  })

  it('should drain staging buffer cleanly', async () => {
    const session = createMockDO()
    const { epoch } = await session.acquireMutex('caller-1')

    await session.stageDelta(
      {
        cycleId: 'cycle-002',
        timestamp_ms: 1729000001000,
        deltaPayload: { scene: 'ep101_sc01', dirty: 0 },
        verified: true,
      },
      epoch,
    )

    const drained = await session.drainStaging()
    expect(drained.length).toBe(1)
    expect(drained[0].cycleId).toBe('cycle-002')

    const postDrainStatus = await session.getStatus()
    expect(postDrainStatus.bufferCount).toBe(0)
  })
})
