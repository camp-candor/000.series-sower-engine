/**
 * 10.location.unit - Outbound Epistemic Sanitizer Buzzer
 * Strips all character lore, actor identities, emotions, and narrative variables.
 */
import crypto from 'node:crypto'
import type {
    ScrubbedPathQuery,
    ScrubbedPerceptionQuery,
    QuerySanitizationResult,
    RawSpatialQueryInput,
} from '../fce/sanitizer.interface.js'
import { packAxial } from './axial-pack.buzz.js'

const BANNED_NARRATIVE_PATTERNS = [
    /^char_/,
    /^actor_/,
    /^dialogue_/,
    /^trauma_/,
    /^grievance_/,
    /^emotion_/,
    /^wound_/,
    /name/i,
    /lore/i,
    /subtext/i,
    /speech/i,
    /belief/i,
]

const canonicalizeJson = (val: unknown): string => {
    if (val === null || typeof val !== 'object') {
        return JSON.stringify(val)
    }
    if (Array.isArray(val)) {
        return '[' + val.map((item) => canonicalizeJson(item)).join(',') + ']'
    }
    const keys = Object.keys(val as Record<string, unknown>).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )
    return (
        '{' +
        keys
            .map(
                (k) =>
                    JSON.stringify(k) + ':' + canonicalizeJson((val as any)[k]),
            )
            .join(',') +
        '}'
    )
}

const detectForbiddenNarrativeTokens = (
    obj: Record<string, unknown>,
): string[] => {
    const violations: string[] = []

    for (const [key, value] of Object.entries(obj)) {
        for (const pattern of BANNED_NARRATIVE_PATTERNS) {
            if (pattern.test(key)) {
                violations.push(`key:${key}`)
            }
            if (typeof value === 'string' && pattern.test(value)) {
                violations.push(`val:${key}=${value}`)
            }
        }
    }

    return violations
}

export const sanitizePathQuery = (
    rawInput: unknown,
): QuerySanitizationResult<ScrubbedPathQuery> => {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
        return {
            ok: false,
            strippedKeys: [],
            error: 'QUERY_PAYLOAD_MUST_BE_OBJECT',
        }
    }

    const record = rawInput as RawSpatialQueryInput
    const breaches = detectForbiddenNarrativeTokens(record)

    if (breaches.length > 0) {
        return {
            ok: false,
            strippedKeys: [],
            error: `EPISTEMIC_FIREWALL_BREACH: Forbidden narrative tokens detected: [${breaches.join(', ')}]`,
        }
    }

    const strippedKeys: string[] = []
    for (const k of Object.keys(record)) {
        if (
            ![
                'qOrigin',
                'rOrigin',
                'qDest',
                'rDest',
                'budget',
                'workLimit',
            ].includes(k)
        ) {
            strippedKeys.push(k)
        }
    }

    if (
        record.qOrigin == null ||
        record.rOrigin == null ||
        record.qDest == null ||
        record.rDest == null
    ) {
        return {
            ok: false,
            strippedKeys,
            error: 'MISSING_MANDATORY_COORDINATES',
        }
    }

    try {
        const originPacked = packAxial(
            Number(record.qOrigin),
            Number(record.rOrigin),
        )
        const destinationPacked = packAxial(
            Number(record.qDest),
            Number(record.rDest),
        )
        const maxBudgetCostUnits = Number.isInteger(record.budget)
            ? Number(record.budget)
            : 1000
        const workEnvelopeLimit = Number.isInteger(record.workLimit)
            ? Number(record.workLimit)
            : 512

        const scrubbedPayload: ScrubbedPathQuery = Object.freeze({
            originPacked,
            destinationPacked,
            maxBudgetCostUnits,
            workEnvelopeLimit,
        })

        const canonicalJson = canonicalizeJson(scrubbedPayload)
        const queryHash = crypto
            .createHash('sha256')
            .update(canonicalJson)
            .digest('hex')

        return {
            ok: true,
            scrubbedPayload,
            queryHash,
            strippedKeys: Object.freeze(strippedKeys),
        }
    } catch (err: any) {
        return {
            ok: false,
            strippedKeys,
            error: err.message || 'AXIAL_PACK_FAILED',
        }
    }
}

export const sanitizePerceptionQuery = (
    rawInput: unknown,
): QuerySanitizationResult<ScrubbedPerceptionQuery> => {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
        return {
            ok: false,
            strippedKeys: [],
            error: 'QUERY_PAYLOAD_MUST_BE_OBJECT',
        }
    }

    const record = rawInput as RawSpatialQueryInput
    const breaches = detectForbiddenNarrativeTokens(record)

    if (breaches.length > 0) {
        return {
            ok: false,
            strippedKeys: [],
            error: `EPISTEMIC_FIREWALL_BREACH: Forbidden narrative tokens detected: [${breaches.join(', ')}]`,
        }
    }

    const strippedKeys: string[] = []
    for (const k of Object.keys(record)) {
        if (
            ![
                'qSource',
                'rSource',
                'qObserver',
                'rObserver',
                'energyCdB',
            ].includes(k)
        ) {
            strippedKeys.push(k)
        }
    }

    if (
        record.qSource == null ||
        record.rSource == null ||
        record.qObserver == null ||
        record.rObserver == null
    ) {
        return {
            ok: false,
            strippedKeys,
            error: 'MISSING_MANDATORY_COORDINATES',
        }
    }

    try {
        const sourceCellPacked = packAxial(
            Number(record.qSource),
            Number(record.rSource),
        )
        const observerCellPacked = packAxial(
            Number(record.qObserver),
            Number(record.rObserver),
        )
        const emissionEnergyCdB = Number.isInteger(record.energyCdB)
            ? Number(record.energyCdB)
            : 7000

        const scrubbedPayload: ScrubbedPerceptionQuery = Object.freeze({
            sourceCellPacked,
            observerCellPacked,
            emissionEnergyCdB,
        })

        const canonicalJson = canonicalizeJson(scrubbedPayload)
        const queryHash = crypto
            .createHash('sha256')
            .update(canonicalJson)
            .digest('hex')

        return {
            ok: true,
            scrubbedPayload,
            queryHash,
            strippedKeys: Object.freeze(strippedKeys),
        }
    } catch (err: any) {
        return {
            ok: false,
            strippedKeys,
            error: err.message || 'AXIAL_PACK_FAILED',
        }
    }
}
