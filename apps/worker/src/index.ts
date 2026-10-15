import { Hono } from 'hono';
import { SowerSessionDO } from './objects/SowerSessionDO.js';
import { coreTools } from './tools.core.js';

export { SowerSessionDO };

export interface Env {
  CANON_DB: D1Database;
  SOWER_SESSION: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

export const systemPrompt = (): string => {
  return [
    'You are Worker-Sower-Engine, the authoritative epistemological narrative state engine.',
    'You have zero authority to perform Git commits, modify local file trees, or invoke cloud GPUs.',
    'Your mandate is to evaluate narrative invariants, enforce somatic and epistemic constraints,',
    'and emit validated dialogue ASTs and unsealed staging deltas for conductor compilation.',
  ].join(' ');
};

app.get('/', (c) => {
  return c.text('WORKER-SOWER-ENGINE EDGE CONTROL PLANE IS LIVE');
});

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'worker-sower-engine',
    engine: 'Worker-Sower-Engine',
    toolsCount: coreTools.length,
    timestamp: Date.now(),
  });
});

app.get('/api/session/:id/status', async (c) => {
  const sessionId = c.req.param('id');
  const doId = c.env.SOWER_SESSION.idFromName(sessionId);
  const stub = c.env.SOWER_SESSION.get(doId);
  const status = await (stub as any).getStatus();
  return c.json({ sessionId, ...status });
});

export default {
  fetch: app.fetch,
};
