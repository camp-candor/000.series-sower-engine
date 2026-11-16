/**
 * 00.engine.unit - Pure Zero-IO Documentation Invariant Verifier
 * Validates that AGENTS.md codifies the Tabula Rasa Reset & Void-State Reversibility Law,
 * The Four-Domain Hookup Mandate, and Triple-Lock confirmation requirements in 7-bit ASCII.
 */

export const TABULA_RASA_REQUIRED_AGENTS_HEADINGS: readonly string[] =
    Object.freeze([
        '## 1. Core Invariants & Non-Negotiable Laws',
        '## 4. Agent Roles & Directive Execution Protocol',
        '## 7. Error Budgets, Backtracking & Halt Conditions',
    ])

export const TABULA_RASA_REQUIRED_TOKENS: readonly string[] = Object.freeze([
    'Tabula Rasa Reset & Void-State Reversibility Law',
    'The Four-Domain Hookup Mandate',
    'ENGINE_UNIT_RESET_REGISTRY',
    'ENGINE_PURGEABLE_TARGETS',
    'ENGINE_RELATIONAL_TABLES',
    'assertSafeEngineResetTarget',
    'CONFIRM_1_OF_3',
    'CONFIRM_2_OF_3',
    'CONFIRM_3_OF_3',
    'CONFLICT_BLOCKED',
])

export interface AgentsResetDocAuditResult {
    readonly valid: boolean
    readonly asciiClean: boolean
    readonly missingHeadings: readonly string[]
    readonly missingTokens: readonly string[]
}

export function verifyAgentsTabulaRasaDocumentation(
    agentsMarkdown: string,
): AgentsResetDocAuditResult {
    if (
        typeof agentsMarkdown !== 'string' ||
        agentsMarkdown.trim().length === 0
    ) {
        return {
            valid: false,
            asciiClean: false,
            missingHeadings: [...TABULA_RASA_REQUIRED_AGENTS_HEADINGS],
            missingTokens: [...TABULA_RASA_REQUIRED_TOKENS],
        }
    }

    let asciiClean = true
    for (let i = 0; i < agentsMarkdown.length; i++) {
        if (agentsMarkdown.charCodeAt(i) > 127) {
            asciiClean = false
            break
        }
    }

    const missingHeadings = TABULA_RASA_REQUIRED_AGENTS_HEADINGS.filter(
        (heading) => !agentsMarkdown.includes(heading),
    )

    const missingTokens = TABULA_RASA_REQUIRED_TOKENS.filter(
        (token) => !agentsMarkdown.includes(token),
    )

    return {
        valid:
            asciiClean &&
            missingHeadings.length === 0 &&
            missingTokens.length === 0,
        asciiClean,
        missingHeadings,
        missingTokens,
    }
}
