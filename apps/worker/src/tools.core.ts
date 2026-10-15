export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any, env: any) => Promise<any>;
}

/**
 * Read-only status diagnostic tool for edge isolate inspection.
 */
export const createGetIsolateStatusTool = (): ToolDefinition => ({
  name: 'get_isolate_status',
  description: 'Inspects current memory, execution metrics, and isolate status.',
  parameters: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  execute: async (_args: unknown, env: any) => {
    return {
      status: 'ONLINE',
      service: 'worker-sower-engine',
      timestamp: Date.now(),
      hasCanonDb: Boolean(env?.CANON_DB),
    };
  },
});

export const coreTools: ToolDefinition[] = [
  createGetIsolateStatusTool(),
];
