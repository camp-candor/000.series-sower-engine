import { describe, it, expect } from 'vitest'
import {
    loadBibleState,
    verifyCanonCheckpoint,
    rfc8785Canonicalize,
    computeSha256,
    CanonDesynchronizedError,
    CanonValidationError,
} from '../../src/canon/bibleLoader.js'
import type { BibleState, ICanonCheckpointPort } from '../../src/canon/types.js'

describe('Cryptographic Merkle Root (H_root) Checkpoint Verifier Suite', () => {
    const baseEntities = {
        characters: {
            char_silas: {
                id: 'char_silas',
                name: 'Silas Vance',
                scope: 'CHARACTER' as const,
                version: 1,
                factionId: 'basin_labor',
                somatic: {
                    armsAvailable: 1,
                    locomotionTier: 'LIMPING' as const,
                    concussionLevel: 1,
                    openWounds: ['brachial_plexus_strain'],
                    bannedKineticVerbs: ['SPRINT', 'TWO_HANDED_LEVER_PULL'],
                },
                logistical: {
                    held: ['item_brass_nozzle'],
                    worn: { torso: 'grease_slicked_duster' },
                    slung: [],
                },
                voice: {
                    surfaceArgument:
                        'The siphon valve was cross-threaded before I arrived.',
                    theUnderneath: 'Guilt over abandoning the turbine crew.',
                    refusalVectors: ['NEVER_SURRENDER_REPAIR_KIT'],
                    callbackPhrases: ['Check the thread pitch.'],
                    centralIrony:
                        'Fixes everyone else engines while letting his own pump freeze.',
                },
            },
        },
        locations: {
            loc_culvert_basin: {
                id: 'loc_culvert_basin',
                name: 'Culvert Basin 04',
                scope: 'LOCATION' as const,
                version: 1,
                portals: ['loc_turbine_gallery'],
                acousticDampingFactor: 2500,
                environmentalModifiers: { water_level_inches: 14 },
            },
        },
        possessions: {
            item_brass_nozzle: {
                id: 'item_brass_nozzle',
                name: 'Machined Brass Siphon Nozzle',
                scope: 'LOGISTIC' as const,
                version: 1,
                holderId: 'char_silas',
                massBasisPoints: 450,
                requiresLimbs: 1,
            },
        },
        grievances: {
            grv_stripped_threads: {
                id: 'grv_stripped_threads',
                scope: 'LAW' as const,
                version: 1,
                sourceActorId: 'char_silas',
                targetActorId: 'char_rc_spurl',
                escalatesToId: null,
                intensityBasisPoints: 6000,
                cooldownCycles: 3,
            },
        },
    }

    const canonicalForm = rfc8785Canonicalize(baseEntities)
    const validStateHash = computeSha256(canonicalForm)

    const validBibleState: BibleState = {
        _meta: {
            seriesSlug: 'wiregrass-basin',
            version: 1,
            compiled_at: '2026-10-17T00:00:00.000Z',
            state_hash: validStateHash,
            compiler_version: '1.0.0',
        },
        ...baseEntities,
    }

    it('>> [TEST] passes verification when snapshot H_root matches string checkpoint exactly', async () => {
        const sealed = loadBibleState(validBibleState)
        const result = await verifyCanonCheckpoint(sealed, validStateHash)

        expect(result.valid).toBe(true)
        expect(result.seriesSlug).toBe('wiregrass-basin')
        expect(result.snapshotStateHash).toBe(validStateHash)
        expect(result.ledgerCheckpointHash).toBe(validStateHash)
        expect(result.isDirty).toBe(false)
    })

    it('>> [TEST] passes verification when querying ICanonCheckpointPort mock', async () => {
        const sealed = loadBibleState(validBibleState)
        const mockPort: ICanonCheckpointPort = {
            async getActiveCheckpoint(slug: string) {
                expect(slug).toBe('wiregrass-basin')
                return {
                    stateHash: validStateHash,
                    isDirty: false,
                }
            },
        }

        const result = await verifyCanonCheckpoint(sealed, mockPort)
        expect(result.valid).toBe(true)
        expect(result.ledgerCheckpointHash).toBe(validStateHash)
    })

    it('>> [TEST] throws CanonDesynchronizedError [CANON_STALE] on hash divergence', async () => {
        const sealed = loadBibleState(validBibleState)
        const divergentHash =
            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

        await expect(
            verifyCanonCheckpoint(sealed, divergentHash),
        ).rejects.toThrow(CanonDesynchronizedError)

        try {
            await verifyCanonCheckpoint(sealed, divergentHash)
        } catch (err) {
            const desyncErr = err as CanonDesynchronizedError
            expect(desyncErr.code).toBe('CANON_STALE')
            expect(desyncErr.isDirty).toBe(true)
            expect(desyncErr.snapshotHash).toBe(validStateHash)
            expect(desyncErr.ledgerHash).toBe(divergentHash)
            expect(desyncErr.message).toContain('[CANON_STALE]')
        }
    })

    it('>> [TEST] throws CanonDesynchronizedError if ledger checkpoint is marked dirty', async () => {
        const sealed = loadBibleState(validBibleState)
        const dirtyPort: ICanonCheckpointPort = {
            async getActiveCheckpoint() {
                return {
                    stateHash: validStateHash,
                    isDirty: true,
                }
            },
        }

        await expect(verifyCanonCheckpoint(sealed, dirtyPort)).rejects.toThrow(
            CanonDesynchronizedError,
        )
    })

    it('>> [TEST] throws CanonDesynchronizedError if no active checkpoint exists for series', async () => {
        const sealed = loadBibleState(validBibleState)
        const emptyPort: ICanonCheckpointPort = {
            async getActiveCheckpoint() {
                return null
            },
        }

        await expect(verifyCanonCheckpoint(sealed, emptyPort)).rejects.toThrow(
            CanonDesynchronizedError,
        )
    })

    it('>> [TEST] throws CanonValidationError if target hash is not 64-character hex', async () => {
        const sealed = loadBibleState(validBibleState)

        await expect(
            verifyCanonCheckpoint(sealed, 'invalid-short-hash'),
        ).rejects.toThrow(CanonValidationError)
        await expect(
            verifyCanonCheckpoint(sealed, 'not_hex_'.repeat(8)),
        ).rejects.toThrow(CanonValidationError)
    })

    it('>> [TEST] accepts a raw BibleState and verifies through the barrel-facing types', async () => {
        const result = await verifyCanonCheckpoint(
            validBibleState,
            validStateHash,
        )
        expect(result.valid).toBe(true)
        expect(result.snapshotStateHash).toBe(validStateHash)
        expect(typeof result.verifiedAtIso).toBe('string')
    })
})
