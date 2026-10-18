import type { AgentEnv, AgentTool } from '@funtuantw/pi-agent-cf'
import { Type, type Static } from '@sinclair/typebox'

// ============================================================================
// WORKER-SOWER-ENGINE: READ-ONLY ISOLATE DIAGNOSTIC TOOLS
// Architectural Law: Zero Git Mutation, Zero Physical File I/O
// ============================================================================

export interface Env extends AgentEnv {
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_API_TOKEN?: string
  CANON_DB?: D1Database
  SOWER_SESSION?: DurableObjectNamespace
}

// ----------------------------------------------------------------------------
// Tool: Get Isolate Diagnostic Status
// ----------------------------------------------------------------------------

export const GetIsolateStatusParams = Type.Object(
  {
    detail_level: Type.Optional(
      Type.String({
        description: 'Level of diagnostic detail: summary or full',
        default: 'summary',
      }),
    ),
  },
  { additionalProperties: false },
)

export const createGetIsolateStatusTool = (
  env: Env,
): AgentTool<typeof GetIsolateStatusParams> => ({
  name: 'get_isolate_status',
  label: 'Get Isolate Diagnostic Status',
  description:
    'Returns runtime memory status, bindings health, and active narrative authority metadata for worker-sower-engine.',
  parameters: GetIsolateStatusParams,
  execute: async (_id: any, args: Static<typeof GetIsolateStatusParams>) => {
    try {
      const diagnostics = {
        service: 'worker-sower-engine',
        status: 'ONLINE',
        mode: 'READ_ONLY_SIMULATION_AUTHORITY',
        hasCanonDb: Boolean(env.CANON_DB),
        hasSowerSession: Boolean(env.SOWER_SESSION),
        detail: args.detail_level || 'summary',
        timestamp_ms: Date.now(),
      }

      const receipt = JSON.stringify({
        action: 'ISOLATE_STATUS_CAPTURED',
        diagnostics,
      })

      return {
        content: [{ type: 'text', text: receipt }],
        details: diagnostics,
      }
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: err.message,
              status: 'FAILED',
            }),
          },
        ],
        details: { error: err.message },
      }
    }
  },
})

// ----------------------------------------------------------------------------
// Core Tools Registry
// ----------------------------------------------------------------------------

export const coreTools = (env: Env): AgentTool<any>[] => [
  createGetIsolateStatusTool(env),
]
