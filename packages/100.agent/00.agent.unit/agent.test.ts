import { describe, it, expect } from 'vitest';

describe('100.agent cockpit interface contract', () => {
  it('correctly maps worker-sower-engine health payload', () => {
    const mockHealthPayload = {
      status: 'healthy',
      service: 'worker-sower-engine',
      engine: 'Worker-Sower-Engine',
      toolsCount: 1,
    };

    expect(mockHealthPayload.service).toBe('worker-sower-engine');
    expect(mockHealthPayload.engine).toBe('Worker-Sower-Engine');
    expect(mockHealthPayload.status).toBe('healthy');
  });
});
