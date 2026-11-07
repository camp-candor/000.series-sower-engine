/**
 * 04.envelope.unit - Envelope Buzz Business Logic
 * RFC 8785 JSON Canonicalization Scheme (JCS), recursive SHA-256 hash chaining,
 * state hashing, and unbroken historical chain verification.
 */
import { createHash } from 'node:crypto'
import { EnvelopeModel, GENESIS_HASH_64 } from '../envelope.model.js'
import type EnvelopeBit from '../fce/envelope.bit.js'
import type {
    EventEnvelope,
    SpatialProof,
    HashChainValidationReport,
    StateHashReceipt,
} from '../fce/envelope.interface.js'
import type State from '../../99.core/state.js'

const HEX_64_REGEX = /^[0-9a-f]{64}$/

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', { idx: 'cns00', src })
            .catch(() => {})
    }
}

export function canonicalizeJson(value: unknown): string {
    if (value === null) {
        return 'null'
    }

    if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError(
                `[NON_FINITE_NUMBER_FORBIDDEN] Non-finite numbers (NaN, Infinity) are prohibited in RFC 8785 JCS: ${value}`,
            )
        }
        if (!Number.isInteger(value)) {
            throw new TypeError(
                `[FLOAT_PROHIBITED] Floating-point numbers are prohibited in simulation canonical preimages: ${value}`,
            )
        }
        return value.toString()
    }

    if (typeof value === 'string') {
        return JSON.stringify(value.normalize('NFC'))
    }

    if (Array.isArray(value)) {
        const elements = value.map((el) =>
            el === undefined ? 'null' : canonicalizeJson(el),
        )
        return `[${elements.join(',')}]`
    }

    if (typeof value === 'object') {
        const sortedKeys = Object.keys(value).sort((a, b) =>
            a < b ? -1 : a > b ? 1 : 0,
        )
        const entries: string[] = []

        for (const key of sortedKeys) {
            const val = (value as Record<string, unknown>)[key]
            if (
                val !== undefined &&
                typeof val !== 'function' &&
                typeof val !== 'symbol'
            ) {
                entries.push(
                    `${JSON.stringify(key.normalize('NFC'))}:${canonicalizeJson(val)}`,
                )
            }
        }
        return `{${entries.join(',')}}`
    }

    return JSON.stringify(value)
}

export function sha256Hex(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex')
}

export function isValidSpatialProof(proof?: SpatialProof): boolean {
    if (!proof) return false
    return (
        HEX_64_REGEX.test(proof.topologyHash) &&
        HEX_64_REGEX.test(proof.overlayHash) &&
        HEX_64_REGEX.test(proof.queryHash) &&
        HEX_64_REGEX.test(proof.receiptHash)
    )
}

export function computeChainedEventHash(
    prevEventHash: string,
    envelopeWithoutEventHash: Omit<EventEnvelope, 'eventHash'>,
): string {
    if (!HEX_64_REGEX.test(prevEventHash)) {
        throw new Error(
            `[INVALID_PREV_HASH] prevEventHash must be a 64-character lowercase hex digest: ${prevEventHash}`,
        )
    }

    const canonicalBody = canonicalizeJson(envelopeWithoutEventHash)
    const preimage = `${prevEventHash}|${canonicalBody}`
    return sha256Hex(preimage)
}

export function computeStateHash(workingState: unknown): string {
    const canonicalState = canonicalizeJson(workingState)
    return sha256Hex(canonicalState)
}

export function verifyHashChain(
    envelopes: readonly EventEnvelope[],
    expectedGenesisHash: string = GENESIS_HASH_64,
): HashChainValidationReport {
    const nowMs = Date.now()

    if (envelopes.length === 0) {
        return {
            valid: true,
            totalEvents: 0,
            verifiedThroughSeq: 0,
            genesisHash: expectedGenesisHash,
            headHash: expectedGenesisHash,
            timestampMs: nowMs,
        }
    }

    let previousHash = expectedGenesisHash

    for (let i = 0; i < envelopes.length; i++) {
        const envelope = envelopes[i]

        // Assert link to predecessor
        if (envelope.prevEventHash !== previousHash) {
            return {
                valid: false,
                totalEvents: envelopes.length,
                verifiedThroughSeq: i === 0 ? 0 : envelopes[i - 1].sequenceId,
                genesisHash: expectedGenesisHash,
                headHash: previousHash,
                failedIndex: i,
                failedEventId: envelope.eventId,
                error: `[HASH_CHAIN_BROKEN] Broken hash chain at index ${i} (Event: ${envelope.eventId}): expected prevHash ${previousHash}, found ${envelope.prevEventHash}`,
                timestampMs: nowMs,
            }
        }

        // Re-evaluate canonical hash
        const { eventHash, ...withoutHash } = envelope
        const recomputedHash = computeChainedEventHash(
            previousHash,
            withoutHash,
        )

        if (recomputedHash !== eventHash) {
            return {
                valid: false,
                totalEvents: envelopes.length,
                verifiedThroughSeq: i === 0 ? 0 : envelopes[i - 1].sequenceId,
                genesisHash: expectedGenesisHash,
                headHash: previousHash,
                failedIndex: i,
                failedEventId: envelope.eventId,
                error: `[HASH_TAMPER_DETECTED] Event payload tampered at index ${i} (Event: ${envelope.eventId}): recorded hash ${eventHash}, computed ${recomputedHash}`,
                timestampMs: nowMs,
            }
        }

        previousHash = eventHash
    }

    return {
        valid: true,
        totalEvents: envelopes.length,
        verifiedThroughSeq: envelopes[envelopes.length - 1].sequenceId,
        genesisHash: expectedGenesisHash,
        headHash: previousHash,
        timestampMs: nowMs,
    }
}

export const initEnvelope = async (
    cpy: EnvelopeModel,
    bal?: EnvelopeBit,
    ste?: State,
): Promise<EnvelopeModel> => {
    cpy.lastSealedHash = GENESIS_HASH_64
    cpy.totalSealedCount = 0
    cpy.lastValidationReport = null

    await emitConsole(
        ste,
        '>> [ENVELOPE:INIT] [OK] RFC 8785 JCS & SHA-256 sealer instantiated.',
    )

    if (bal?.slv) {
        bal.slv({
            envelopeBit: {
                idx: 'init-envelope-pass',
                val: 1,
                src: GENESIS_HASH_64,
            },
        })
    }
    return cpy
}

export const updateEnvelope = (
    cpy: EnvelopeModel,
    bal?: EnvelopeBit,
    _ste?: State,
): EnvelopeModel => {
    if (bal?.slv) {
        bal.slv({
            envelopeBit: {
                idx: 'update-envelope-pass',
                val: 1,
            },
        })
    }
    return cpy
}

export const canonicalizeEnvelopeAction = (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    _ste?: State,
): EnvelopeModel => {
    try {
        const canonicalString = canonicalizeJson(bal.dat?.rawObject)
        if (bal.slv) {
            bal.slv({
                canonicalString,
                envelopeBit: {
                    idx: 'canonicalize-envelope-pass',
                    val: 1,
                    src: canonicalString,
                    dat: { canonicalString },
                },
            })
        }
    } catch (err: any) {
        if (bal.slv) {
            bal.slv({
                envelopeBit: {
                    idx: 'canonicalize-envelope-fail',
                    val: 0,
                    dat: { error: err.message || String(err) },
                },
            })
        }
    }
    return cpy
}

export const sealEventEnvelopeAction = async (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    ste?: State,
): Promise<EnvelopeModel> => {
    try {
        const raw = bal.dat
        if (!raw || !raw.eventId || raw.sequenceId === undefined) {
            throw new Error(
                '[INVALID_ENVELOPE_DATA] Missing mandatory envelope fields',
            )
        }

        const prevHash = raw.prevEventHash || cpy.lastSealedHash
        if (!HEX_64_REGEX.test(prevHash)) {
            throw new Error(
                `[INVALID_PREV_HASH] prevEventHash must be a 64-char hex string: ${prevHash}`,
            )
        }

        if (raw.spatialProof && !isValidSpatialProof(raw.spatialProof)) {
            throw new Error(
                '[INVALID_SPATIAL_PROOF] SpatialProof contains non-64-hex hash elements',
            )
        }

        const envelopeWithoutHash: Omit<EventEnvelope, 'eventHash'> = {
            eventId: raw.eventId,
            streamId: raw.streamId || 'main',
            sequenceId: raw.sequenceId,
            tick: raw.tick || 0,
            eventType: raw.eventType || 'GENERIC_EVENT',
            schemaVersion: raw.schemaVersion || 1,
            actorId: raw.actorId,
            targetId: raw.targetId,
            seed: raw.seed || '0',
            payload: raw.payload,
            spatialProof: raw.spatialProof,
            prevEventHash: prevHash,
            stateHash: raw.stateHash || '0'.repeat(64),
            timestampMs: raw.timestampMs || Date.now(),
        }

        const eventHash = computeChainedEventHash(prevHash, envelopeWithoutHash)
        const sealedEnvelope: EventEnvelope = {
            ...envelopeWithoutHash,
            eventHash,
        }

        cpy.lastSealedHash = eventHash
        cpy.totalSealedCount += 1

        await emitConsole(
            ste,
            `>> [ENVELOPE:SEAL] [OK] Sealed event '${sealedEnvelope.eventId}' -> ${eventHash.slice(0, 16)}... (Seq #${sealedEnvelope.sequenceId})`,
        )

        if (bal.slv) {
            bal.slv({
                envelope: sealedEnvelope,
                envelopeBit: {
                    idx: 'seal-envelope-pass',
                    val: 1,
                    src: eventHash,
                    dat: { envelope: sealedEnvelope, eventHash },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        await emitConsole(ste, `:: [FAIL] Sealing aborted: ${errorMsg}`)
        if (bal.slv) {
            bal.slv({
                envelopeBit: {
                    idx: 'seal-envelope-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }
    return cpy
}

export const hashStateEnvelopeAction = async (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    ste?: State,
): Promise<EnvelopeModel> => {
    try {
        const rawObject = bal.dat?.rawObject
        const canonical = canonicalizeJson(rawObject)
        const stateHash = sha256Hex(canonical)

        const receipt: StateHashReceipt = {
            stateHash,
            canonicalLength: canonical.length,
            timestampMs: Date.now(),
        }

        await emitConsole(
            ste,
            `>> [ENVELOPE:STATE_HASH] [OK] Minted composite state digest: ${stateHash.slice(0, 16)}...`,
        )

        if (bal.slv) {
            bal.slv({
                stateReceipt: receipt,
                envelopeBit: {
                    idx: 'hash-state-pass',
                    val: 1,
                    src: stateHash,
                    dat: { stateReceipt: receipt },
                },
            })
        }
    } catch (err: any) {
        const errorMsg = err.message || String(err)
        if (bal.slv) {
            bal.slv({
                envelopeBit: {
                    idx: 'hash-state-fail',
                    val: 0,
                    dat: { error: errorMsg },
                },
            })
        }
    }
    return cpy
}

export const verifyChainEnvelopeAction = async (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    ste?: State,
): Promise<EnvelopeModel> => {
    const envelopes = bal.lst || bal.dat?.envelopes || []
    const expectedGenesis = bal.src || bal.dat?.prevEventHash || GENESIS_HASH_64

    const report = verifyHashChain(envelopes, expectedGenesis)
    cpy.lastValidationReport = report

    if (report.valid) {
        await emitConsole(
            ste,
            `>> [ENVELOPE:VERIFY] [OK] Hash chain verified: ${report.totalEvents} blocks sound. Head: ${report.headHash.slice(0, 16)}...`,
        )
    } else {
        await emitConsole(ste, `:: [ENVELOPE:VERIFY] [FAIL] ${report.error}`)
    }

    if (bal.slv) {
        bal.slv({
            report,
            envelopeBit: {
                idx: report.valid ? 'verify-chain-pass' : 'verify-chain-fail',
                val: report.valid ? 1 : 0,
                src: report.headHash,
                dat: { report, error: report.error },
            },
        })
    }
    return cpy
}

export const validateSpatialProofAction = (
    cpy: EnvelopeModel,
    bal: EnvelopeBit,
    _ste?: State,
): EnvelopeModel => {
    const proof = bal.dat?.spatialProof
    const isValid = isValidSpatialProof(proof)

    if (bal.slv) {
        bal.slv({
            isValidSpatial: isValid,
            envelopeBit: {
                idx: isValid
                    ? 'validate-spatial-pass'
                    : 'validate-spatial-fail',
                val: isValid ? 1 : 0,
                dat: { isValidSpatial: isValid },
            },
        })
    }
    return cpy
}
