import { createHash } from 'node:crypto'
import type { EnvelopeModel } from '../envelope.model'
import { GENESIS_HASH_64 } from '../envelope.model'
import type EnvelopeBit from '../fce/envelope.bit'
import type State from '../../99.core/state'
import type {
    EventEnvelope,
    HashChainValidationReport,
    SpatialProof,
} from '../fce/envelope.interface'

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/

export const emitConsole = async (
    ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
            return
        } catch {
            // Non-blocking degradation
        }
    }
    if (ste && typeof ste.hunt === 'function') {
        try {
            await ste.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
        } catch {
            // Non-blocking degradation
        }
    }
}

/**
 * Computes pure SHA-256 lowercase hexadecimal digest of string payload.
 */
export function sha256Hex(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * Pure RFC 8785 JSON Canonicalization Scheme (JCS).
 * - Recursively sorts dictionary keys by UTF-16 code units.
 * - Normalizes string literals using Unicode Normalization Form C (NFC).
 * - Rejects non-finite numbers (NaN, Infinity).
 * - Strips non-serializable values (undefined, functions, symbols).
 * - Preserves exact array element ordering.
 */
export function canonicalizeJson(value: unknown): string {
    if (value === null) return 'null'
    if (typeof value === 'boolean') return value ? 'true' : 'false'

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError(
                '[RFC8785_ERROR] Non-finite numbers (NaN, Infinity) are prohibited in canonical JSON',
            )
        }
        return JSON.stringify(value)
    }

    if (typeof value === 'string') {
        return JSON.stringify(value.normalize('NFC'))
    }

    if (Array.isArray(value)) {
        const serializedItems = value.map((item) => {
            const res = canonicalizeJson(item)
            return res === undefined ? 'null' : res
        })
        return `[${serializedItems.join(',')}]`
    }

    if (typeof value === 'object') {
        const obj = value as Record<string, unknown>
        // prettier-ignore
        const sortedKeys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

        const keyValuePairs: string[] = []
        for (const key of sortedKeys) {
            const propVal = obj[key]
            if (
                propVal === undefined ||
                typeof propVal === 'function' ||
                typeof propVal === 'symbol'
            ) {
                continue
            }
            const serializedProp = canonicalizeJson(propVal)
            keyValuePairs.push(
                `${JSON.stringify(key.normalize('NFC'))}:${serializedProp}`,
            )
        }

        return `{${keyValuePairs.join(',')}}`
    }

    return undefined as unknown as string
}

/**
 * Validates that a SpatialProof contains four valid 64-character lowercase hex SHA-256 digests.
 */
export function isValidSpatialProof(
    proof: SpatialProof | undefined | null,
): boolean {
    if (!proof) return false
    return (
        SHA256_HEX_REGEX.test(proof.topologyHash) &&
        SHA256_HEX_REGEX.test(proof.overlayHash) &&
        SHA256_HEX_REGEX.test(proof.queryHash) &&
        SHA256_HEX_REGEX.test(proof.receiptHash)
    )
}

/**
 * Computes chained event hash:
 * H_n = SHA-256(prevEventHash || ":" || CanonicalJCS(Envelope \ {eventHash}))
 */
export function computeChainedEventHash(
    prevHash: string,
    envelope: Partial<EventEnvelope>,
): string {
    if (!SHA256_HEX_REGEX.test(prevHash)) {
        throw new Error(
            `[HASH_CHAIN_ERROR] Invalid prevEventHash: must be 64-hex SHA-256, received '${prevHash}'`,
        )
    }

    // prevHash: binds predecessor block to canonical envelope payload
    const { eventHash, ...sanitizedEnvelope } = envelope

    const canonicalPayload = canonicalizeJson(sanitizedEnvelope)
    const preimage = `${prevHash}:${canonicalPayload}`
    return sha256Hex(preimage)
}

/**
 * Computes state hash across a composite working state object.
 */
export function computeStateHash(workingState: unknown): string {
    const canonical = canonicalizeJson(workingState)
    return sha256Hex(canonical)
}

export const initEnvelope = async (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    ste: State,
): Promise<EnvelopeModel> => {
    cpy.genesisHash = GENESIS_HASH_64
    cpy.lastSealedHash = GENESIS_HASH_64
    cpy.totalSealedCount = 0

    if (ste?.value?.envelope) {
        ste.value.envelope.genesisHash = cpy.genesisHash
        ste.value.envelope.lastSealedHash = cpy.lastSealedHash
        ste.value.envelope.totalSealedCount = cpy.totalSealedCount
    }

    await emitConsole(
        ste,
        `>> [ENVELOPE:INIT] [OK] RFC 8785 sealer online. Genesis: ${GENESIS_HASH_64.slice(0, 8)}...`,
    )

    if (bal?.slv) {
        bal.slv({
            envBit: { idx: 'init-envelope', src: cpy.genesisHash, val: 0 },
            hash: cpy.genesisHash,
        })
    }
    return cpy
}

export const updateEnvelope = async (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    _ste: State,
): Promise<EnvelopeModel> => {
    if (bal?.slv) {
        bal.slv({
            envBit: {
                idx: 'update-envelope',
                src: cpy.lastSealedHash,
                val: cpy.totalSealedCount,
            },
            hash: cpy.lastSealedHash,
        })
    }
    return cpy
}

export const canonicalizeEnvelopeAction = (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    _ste: State,
): EnvelopeModel => {
    const target = bal?.dat ?? (bal?.src ? JSON.parse(bal.src) : null)

    try {
        const canonical = canonicalizeJson(target)
        if (bal?.slv) {
            bal.slv({
                envBit: { idx: 'canonicalize-envelope', src: canonical },
                canonical,
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const sealEventEnvelopeAction = async (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    ste: State,
): Promise<EnvelopeModel> => {
    const rawEnvelope: Partial<EventEnvelope> = bal?.dat || {}
    const prevHash =
        rawEnvelope.prevEventHash || cpy.lastSealedHash || GENESIS_HASH_64

    try {
        if (
            rawEnvelope.spatialProof &&
            !isValidSpatialProof(rawEnvelope.spatialProof)
        ) {
            throw new Error(
                '[SPATIAL_PROOF_ERROR] Invalid spatial proof hashes in envelope payload',
            )
        }

        const unsealed: Partial<EventEnvelope> = {
            ...rawEnvelope,
            prevEventHash: prevHash,
        }

        const calculatedHash = computeChainedEventHash(prevHash, unsealed)
        const sealed: EventEnvelope = {
            ...unsealed,
            prevEventHash: prevHash,
            eventHash: calculatedHash,
        } as EventEnvelope

        cpy.lastSealedHash = calculatedHash
        cpy.totalSealedCount += 1

        if (ste?.value?.envelope) {
            ste.value.envelope.lastSealedHash = cpy.lastSealedHash
            ste.value.envelope.totalSealedCount = cpy.totalSealedCount
        }

        await emitConsole(
            ste,
            `>> [ENVELOPE:SEAL] [OK] Sealed event '${sealed.eventId || 'evt'}' -> ${calculatedHash.slice(0, 8)}...`,
        )

        if (bal?.slv) {
            bal.slv({
                envBit: {
                    idx: 'seal-event-envelope',
                    src: calculatedHash,
                    val: sealed.sequenceId,
                },
                hash: calculatedHash,
                envelope: sealed,
            })
        }
    } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        await emitConsole(ste, `:: [ENVELOPE:SEAL] [FAIL] ${errorMsg}`)
        if (bal?.slv) bal.slv({ err: errorMsg })
    }

    return cpy
}

export const hashStateEnvelopeAction = (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    _ste: State,
): EnvelopeModel => {
    const statePayload = bal?.dat

    try {
        const hash = computeStateHash(statePayload)
        if (bal?.slv) {
            bal.slv({
                envBit: { idx: 'hash-state-envelope', src: hash },
                hash,
            })
        }
    } catch (err: any) {
        if (bal?.slv) bal.slv({ err: err.message })
    }

    return cpy
}

export const verifyChainEnvelopeAction = async (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    ste: State,
): Promise<EnvelopeModel> => {
    const chain: EventEnvelope[] = Array.isArray(bal?.lst)
        ? bal.lst
        : (bal?.dat as any)?.chain || []
    const expectedGenesis = bal?.src || GENESIS_HASH_64

    if (chain.length === 0) {
        const emptyReport: HashChainValidationReport = {
            valid: true,
            totalEvents: 0,
            verifiedThroughSeq: 0,
            genesisHash: expectedGenesis,
            headHash: expectedGenesis,
        }
        if (bal?.slv) bal.slv({ report: emptyReport })
        return cpy
    }

    let currentPrev = expectedGenesis

    for (let i = 0; i < chain.length; i++) {
        const event = chain[i]

        if (event.prevEventHash !== currentPrev) {
            const err = `[HASH_CHAIN_BROKEN] Event #${event.sequenceId} (${event.eventId}) prevEventHash '${event.prevEventHash}' does not match expected predecessor '${currentPrev}'`
            await emitConsole(ste, `:: ${err}`)
            const report: HashChainValidationReport = {
                valid: false,
                totalEvents: chain.length,
                verifiedThroughSeq: i > 0 ? chain[i - 1].sequenceId : 0,
                genesisHash: expectedGenesis,
                headHash: currentPrev,
                failedIndex: i,
                failedEventId: event.eventId,
                error: err,
            }
            if (bal?.slv) bal.slv({ report, err })
            return cpy
        }

        const recomputedHash = computeChainedEventHash(currentPrev, event)
        if (recomputedHash !== event.eventHash) {
            const err = `[HASH_TAMPER_DETECTED] Event #${event.sequenceId} (${event.eventId}) recorded hash '${event.eventHash}' diverges from recomputed digest '${recomputedHash}'`
            await emitConsole(ste, `:: ${err}`)
            const report: HashChainValidationReport = {
                valid: false,
                totalEvents: chain.length,
                verifiedThroughSeq: i > 0 ? chain[i - 1].sequenceId : 0,
                genesisHash: expectedGenesis,
                headHash: currentPrev,
                failedIndex: i,
                failedEventId: event.eventId,
                error: err,
            }
            if (bal?.slv) bal.slv({ report, err })
            return cpy
        }

        currentPrev = event.eventHash!
    }

    const finalHead = chain[chain.length - 1].eventHash || currentPrev
    const successReport: HashChainValidationReport = {
        valid: true,
        totalEvents: chain.length,
        verifiedThroughSeq: chain[chain.length - 1].sequenceId,
        genesisHash: expectedGenesis,
        headHash: finalHead,
    }

    await emitConsole(
        ste,
        `>> [ENVELOPE:VERIFY] [OK] Hash chain verified: ${chain.length} blocks sound. Head: ${finalHead.slice(0, 8)}...`,
    )

    if (bal?.slv) {
        bal.slv({
            envBit: {
                idx: 'verify-chain-envelope',
                val: chain.length,
                src: finalHead,
            },
            report: successReport,
        })
    }
    return cpy
}

export const validateSpatialProofAction = (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    _ste: State,
): EnvelopeModel => {
    const proof: SpatialProof = bal?.dat
    const valid = isValidSpatialProof(proof)

    if (bal?.slv) {
        bal.slv({
            envBit: {
                idx: valid
                    ? 'validate-spatial-proof'
                    : 'validate-spatial-proof-fail',
            },
            proofValid: valid,
            err: valid
                ? undefined
                : '[INVALID_SPATIAL_PROOF] One or more hashes failed 64-hex SHA-256 pattern',
        })
    }
    return cpy
}
