import { describe, it, expect } from 'vitest'
import {
    compileCanonSnapshot,
    CanonValidationError,
    CanonDesynchronizedError,
} from '../../src/core/canon/bibleLoader.js'
import { assertCanonMerkleLock } from '../../src/client.js'
import { BibleState } from '../../src/core/canon/types.js'
import { D1Database } from '@cloudflare/workers-types'

const createValidMockCanon = (): BibleState => ({
    _meta: {
        seriesSlug: 'under-the-floorboards',
        state_hash:
            '268e2c748c069601a0be935cccf4b1d6268e2c748c069601a0be935cccf4b1d6',
        compiled_at: '2026-10-15T00:00:00Z',
        compiler_version: '1.0.0',
    },
    characters: {
        char_silas: {
            id: 'char_silas',
            name: 'Silas',
            scope: 'CHARACTER',
            version: 1,
            somatic: {
                armsAvailable: 1,
                locomotionTier: 'LIMPING',
                concussionLevel: 0,
                openWounds: ['brachial_plexus_severed'],
                bannedKineticVerbs: ['CLIMB_LADDER'],
            },
            logistical: {
                held: ['item_copper_flange'],
                worn: { torso: 'grease_smock' },
                slung: [],
            },
            voice: {
                surfaceArgument: 'We need to seal the hatch.',
                theUnderneath: 'He knows the valve is ruined.',
                refusalVectors: ['Refuses to surrender the wrench'],
                callbackPhrases: ['Watch the pressure.'],
            },
        },
        char_wart: {
            id: 'char_wart',
            name: 'Wart',
            scope: 'CHARACTER',
            version: 1,
            somatic: {
                armsAvailable: 2,
                locomotionTier: 'UNRESTRICTED',
                concussionLevel: 0,
                openWounds: [],
                bannedKineticVerbs: [],
            },
            logistical: {
                held: [],
                worn: {},
                slung: [],
            },
            voice: {
                surfaceArgument: 'Stand aside.',
                theUnderneath: 'Terrified of the dark.',
                refusalVectors: [],
                callbackPhrases: ['Get back.'],
            },
        },
    },
    locations: {
        loc_sub_level_4: {
            id: 'loc_sub_level_4',
            name: 'Sub Level 4',
            scope: 'LOCATION',
            version: 1,
            portals: ['loc_culvert_vault'],
            environmentalModifiers: { water_level_centimeters: 45 },
        },
        loc_culvert_vault: {
            id: 'loc_culvert_vault',
            name: 'Culvert Vault',
            scope: 'LOCATION',
            version: 1,
            portals: ['loc_sub_level_4'],
            environmentalModifiers: {},
        },
    },
    possessions: {
        item_copper_flange: {
            id: 'item_copper_flange',
            name: 'Copper Flange',
            scope: 'LOGISTIC',
            version: 1,
            holderId: 'char_silas',
            massBasisPoints: 450,
            requiresLimbs: 1,
        },
    },
    grievances: {
        grv_stolen_siphon: {
            id: 'grv_stolen_siphon',
            scope: 'LAW',
            version: 1,
            sourceActorId: 'char_silas',
            targetActorId: 'char_wart',
            escalatesToId: 'grv_blood_debt',
            intensityBasisPoints: 6500,
        },
        grv_blood_debt: {
            id: 'grv_blood_debt',
            scope: 'LAW',
            version: 1,
            sourceActorId: 'char_silas',
            targetActorId: 'char_wart',
            escalatesToId: null,
            intensityBasisPoints: 9500,
        },
    },
})

describe('Phase 2: Canon Ingestion & Relational Integrity Gauntlet', () => {
    it('Passes valid canon and freezes structure against runtime mutations', () => {
        const raw = createValidMockCanon()
        const compiled = compileCanonSnapshot(raw)

        expect(compiled._meta.seriesSlug).toBe('under-the-floorboards')
        expect(Object.isFrozen(compiled)).toBe(true)
        expect(Object.isFrozen(compiled.characters.char_silas)).toBe(true)
        expect(
            Object.isFrozen(compiled.characters.char_silas.logistical.held),
        ).toBe(true)

        // Assert runtime immutability throws fatal TypeError
        expect(() => {
            ;(compiled.characters.char_silas.logistical.held as string[]).push(
                'item_contraband',
            )
        }).toThrow(TypeError)
    })

    it('Catches Pass 1 schema violations (e.g. invalid scalar bounds or IDs)', () => {
        const raw: any = createValidMockCanon()
        raw.characters.char_silas.somatic.armsAvailable = 5 // Max 2

        expect(() => compileCanonSnapshot(raw)).toThrow(CanonValidationError)
    })

    it('Catches Pass 2 dangling foreign keys (e.g. invalid holderId)', () => {
        const raw = createValidMockCanon()
        raw.possessions.item_copper_flange.holderId = 'char_non_existent'

        expect(() => compileCanonSnapshot(raw)).toThrow(
            /references non-existent holderId: char_non_existent/,
        )
    })

    it('Catches Pass 2 cyclic grievance escalation loops (A -> B -> A)', () => {
        const raw = createValidMockCanon()
        // Introduce cycle: grv_blood_debt escalates back to grv_stolen_siphon
        raw.grievances.grv_blood_debt.escalatesToId = 'grv_stolen_siphon'

        expect(() => compileCanonSnapshot(raw)).toThrow(
            /CYCLIC_GRIEVANCE_DETECTED/,
        )
    })

    it('Enforces Merkle Root ($H_{root}$) checkpoint matching against D1', async () => {
        const canon = compileCanonSnapshot(createValidMockCanon())

        const mockDbSuccess = {
            prepare: () => ({
                bind: () => ({
                    first: async () => ({ state_hash: canon._meta.state_hash }),
                }),
            }),
        } as unknown as D1Database

        // Should resolve without error
        await expect(
            assertCanonMerkleLock(canon, mockDbSuccess),
        ).resolves.not.toThrow()

        const mockDbDiverged = {
            prepare: () => ({
                bind: () => ({
                    first: async () => ({
                        state_hash:
                            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                    }),
                }),
            }),
        } as unknown as D1Database

        // Must reject with CanonDesynchronizedError
        await expect(
            assertCanonMerkleLock(canon, mockDbDiverged),
        ).rejects.toThrow(CanonDesynchronizedError)
    })
})
