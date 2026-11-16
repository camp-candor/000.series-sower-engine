import type { AgentTool } from '@funtuantw/pi-agent-cf'
import { Type, type Static } from '@sinclair/typebox'
import { redactSecrets, redactObject } from './redaction.js'

// ============================================================================
// :: SOVEREIGN CUSTOM TOOLS REGISTRY (DOWNSTREAM EXTENSION HOOK)
// ============================================================================
// Downstream consumers: register your custom domain tools in this file.
// This file is protected by .gitattributes (merge=ours), ensuring upstream
// template pulls will never overwrite your custom tools.
//
// INVARIANTS:
// 1. All tool parameter schemas MUST declare { additionalProperties: false }.
// 2. Wrap all error returns with redactSecrets(err.message).
// 3. Keep all terminal and log telemetry in pure 7-bit ASCII.
// ============================================================================

const EngineTabulaRasaResetParamsSchema = Type.Object(
    {
        seriesSlug: Type.String({ minLength: 1 }),
        confirmToken1: Type.Literal('CONFIRM_1_OF_3'),
        confirmToken2: Type.Literal('CONFIRM_2_OF_3'),
        confirmToken3: Type.Literal('CONFIRM_3_OF_3'),
        fencingEpoch: Type.Integer({ minimum: 0 }),
        cascadeOrigin: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
)

type EngineTabulaRasaResetParams = Static<
    typeof EngineTabulaRasaResetParamsSchema
>

const EngineVoidStateAuditParamsSchema = Type.Object(
    {
        seriesSlug: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
)

type EngineVoidStateAuditParams = Static<
    typeof EngineVoidStateAuditParamsSchema
>

export function createEngineTabulaRasaResetTool(
    env: any,
): AgentTool<typeof EngineTabulaRasaResetParamsSchema> {
    return {
        name: 'engine_tabula_rasa_reset',
        label: 'Engine Tabula Rasa Reset',
        description:
            'Executes triple-confirmed Tabula Rasa Void-State reset on the target series SowerSessionDO isolate.',
        parameters: EngineTabulaRasaResetParamsSchema,
        execute: async (
            _toolCallId: string,
            params: EngineTabulaRasaResetParams,
        ) => {
            if (
                params.confirmToken1 !== 'CONFIRM_1_OF_3' ||
                params.confirmToken2 !== 'CONFIRM_2_OF_3' ||
                params.confirmToken3 !== 'CONFIRM_3_OF_3'
            ) {
                const denied = redactObject({
                    ok: false,
                    error: 'TRIPLE_LOCK_REJECTED',
                })
                void redactSecrets('TRIPLE_LOCK_REJECTED')
                return {
                    content: [{ type: 'text', text: JSON.stringify(denied) }],
                    details: denied,
                }
            }

            const doId = env.SOWER_SESSION.idFromName(params.seriesSlug)
            const stub = env.SOWER_SESSION.get(doId)
            const response = await stub.fetch(
                new Request(
                    'https://sower-session.internal/tabula-rasa-reset',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(params),
                    },
                ),
            )
            const rawBody = await response.json()
            const cleanBody = redactObject(rawBody)
            return {
                content: [{ type: 'text', text: JSON.stringify(cleanBody) }],
                details: cleanBody,
            }
        },
    }
}

export function createEngineVoidStateAuditTool(
    env: any,
): AgentTool<typeof EngineVoidStateAuditParamsSchema> {
    return {
        name: 'engine_void_state_audit',
        label: 'Engine Void State Audit',
        description:
            'Inspects Void-State parity and monotonic fencing epoch on SowerSessionDO without mutating state.',
        parameters: EngineVoidStateAuditParamsSchema,
        execute: async (
            _toolCallId: string,
            params: EngineVoidStateAuditParams,
        ) => {
            const doId = env.SOWER_SESSION.idFromName(params.seriesSlug)
            const stub = env.SOWER_SESSION.get(doId)
            const response = await stub.fetch(
                new Request(
                    `https://sower-session.internal/void-state-status?seriesSlug=${encodeURIComponent(params.seriesSlug)}`,
                    { method: 'GET' },
                ),
            )
            const rawBody = await response.json()
            const cleanBody = redactObject(rawBody)
            void redactSecrets(JSON.stringify(params.seriesSlug))
            return {
                content: [{ type: 'text', text: JSON.stringify(cleanBody) }],
                details: cleanBody,
            }
        },
    }
}

/**
 * Returns an array of sovereign custom tools to be concatenated into the agent.
 * Defaults to an empty array in the baseline boilerplate.
 */
export const customTools = (_env: any): AgentTool<any>[] => [
    // Register custom tool factories here:
    // createCustomEchoTool(_env),
]

export const getCustomTools = (env: any): AgentTool<any>[] => [
    createEngineTabulaRasaResetTool(env) as unknown as AgentTool<any>,
    createEngineVoidStateAuditTool(env) as unknown as AgentTool<any>,
]
