import { describe, expect, it } from 'vitest'
import { CompileModel } from '../compile.model.js'
import {
    canonicalizeJcs,
    gate0Verify,
    initCompile,
    pass1Evaluate,
    pass2Traverse,
    pass3Seal,
    runCompile,
} from '../buz/compile.buzz.js'
import { WIREGRASS_BASIN_CANON_CORPUS } from '../buz/wiregrass-canon.fixture.js'
import { CompileCorpusPayload } from '../fce/compile.bit.js'

describe('Phase II: Pure Zero-IO 3-Pass Compile Unit & Canon Merkle Verification', () => {
    it('initCompile resets model state to IDLE and binds series metadata', () => {
        const model = new CompileModel()
        let resolvedIdx = ''

        initCompile(model, {
            idx: 'init-compile',
            dat: {
                seriesSlug: 'wiregrass-basin',
                sourceDir: 'corpus/wiregrass-basin',
                outputDir: 'compiled/wiregrass-basin',
            },
            slv: (res) => {
                resolvedIdx = res.cmpBit?.idx ?? ''
            },
        })

        expect(resolvedIdx).toBe('init-compile')
        expect(model.status).toBe('IDLE')
        expect(model.activeSeriesSlug).toBe('wiregrass-basin')
    })

    it('pass1Evaluate rejects duplicate entity IDs and out-of-range basis points (> 10000 or < 0)', () => {
        const model = new CompileModel()
        const badCorpus: CompileCorpusPayload = {
            ...WIREGRASS_BASIN_CANON_CORPUS,
            characters: [
                ...WIREGRASS_BASIN_CANON_CORPUS.characters,
                {
                    id: 'char_johnny_walkman',
                    name: 'Duplicate Johnny',
                    somaticState: {
                        enduranceBp: 12000,
                        stressBp: -5,
                    },
                },
            ],
        }

        let errCode = ''
        pass1Evaluate(model, {
            idx: 'pass1-shape-eval',
            dat: { corpus: badCorpus },
            slv: (res) => {
                errCode = res.errBit?.code ?? ''
            },
        })

        expect(model.status).toBe('FAILED')
        expect(errCode).toBe('GATE_1_SYNTAX_BOUNDS')
        expect(
            model.validationReport?.failures.some((f) =>
                f.message.includes('Duplicate entity id'),
            ),
        ).toBe(true)
        expect(
            model.validationReport?.failures.some((f) =>
                f.message.includes('violates integer basis-point bounds'),
            ),
        ).toBe(true)
    })

    it('pass2Traverse rejects dangling holderCharacterId, asymmetric portals, and 3-node grievance cycles', () => {
        const model = new CompileModel()
        const cyclicCorpus: CompileCorpusPayload = {
            characters: WIREGRASS_BASIN_CANON_CORPUS.characters,
            locations: [
                {
                    id: 'loc_a',
                    name: 'Location A',
                    connectedLocationIds: ['loc_b'],
                    capacityBp: 5000,
                },
                {
                    id: 'loc_b',
                    name: 'Location B',
                    connectedLocationIds: [],
                    capacityBp: 5000,
                },
            ],
            possessions: [
                {
                    id: 'pos_orphan',
                    name: 'Orphaned Wrench',
                    holderCharacterId: 'char_missing_ghost',
                    durabilityBp: 5000,
                },
            ],
            grievances: [
                {
                    id: 'grv_1',
                    sourceCharacterId: 'char_johnny_walkman',
                    targetCharacterId: 'char_orbie_mayhaw',
                    intensityBp: 5000,
                    dependsOnGrievanceIds: ['grv_2'],
                },
                {
                    id: 'grv_2',
                    sourceCharacterId: 'char_orbie_mayhaw',
                    targetCharacterId: 'char_miss_beverly',
                    intensityBp: 5000,
                    dependsOnGrievanceIds: ['grv_3'],
                },
                {
                    id: 'grv_3',
                    sourceCharacterId: 'char_miss_beverly',
                    targetCharacterId: 'char_johnny_walkman',
                    intensityBp: 5000,
                    dependsOnGrievanceIds: ['grv_1'],
                },
            ],
        }

        let errCode = ''
        pass2Traverse(model, {
            idx: 'pass2-relational-sweep',
            dat: { corpus: cyclicCorpus },
            slv: (res) => {
                errCode = res.errBit?.code ?? ''
            },
        })

        expect(model.status).toBe('FAILED')
        expect(errCode).toBe('GATE_2_RELATIONAL_DAG')
        const messages =
            model.validationReport?.failures.map((f) => f.message) ?? []
        expect(
            messages.some((m) => m.includes('dangling holderCharacterId')),
        ).toBe(true)
        expect(messages.some((m) => m.includes('Asymmetric portal'))).toBe(true)
        expect(
            messages.some((m) =>
                m.includes('Cyclic grievance dependency detected'),
            ),
        ).toBe(true)
    })

    it('pass3Seal produces identical RFC 8785 JCS SHA-256 Merkle root regardless of key or array ordering and catches GATE_3_SEAL_DRIFT', () => {
        expect(canonicalizeJcs({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')

        const modelA = new CompileModel()
        runCompile(modelA, {
            idx: 'run-compile',
            dat: {
                seriesSlug: 'wiregrass-basin',
                corpus: WIREGRASS_BASIN_CANON_CORPUS,
            },
        })

        const reversedCorpus: CompileCorpusPayload = {
            characters: [...WIREGRASS_BASIN_CANON_CORPUS.characters].reverse(),
            locations: [...WIREGRASS_BASIN_CANON_CORPUS.locations].reverse(),
            possessions: [
                ...WIREGRASS_BASIN_CANON_CORPUS.possessions,
            ].reverse(),
            grievances: [...WIREGRASS_BASIN_CANON_CORPUS.grievances].reverse(),
        }

        const modelB = new CompileModel()
        runCompile(modelB, {
            idx: 'run-compile',
            dat: {
                seriesSlug: 'wiregrass-basin',
                corpus: reversedCorpus,
            },
        })

        expect(modelA.status).toBe('SEALED')
        expect(modelB.status).toBe('SEALED')
        expect(modelA.rootMerkleHash).toMatch(/^[a-f0-9]{64}$/)
        expect(modelA.rootMerkleHash).toBe(modelB.rootMerkleHash)

        const driftModel = new CompileModel()
        let driftCode = ''
        pass3Seal(driftModel, {
            idx: 'pass3-deterministic-seal',
            dat: {
                seriesSlug: 'wiregrass-basin',
                corpus: WIREGRASS_BASIN_CANON_CORPUS,
                expectedRootMerkleHash: '0'.repeat(64),
            },
            slv: (res) => {
                driftCode = res.errBit?.code ?? ''
            },
        })

        expect(driftModel.status).toBe('FAILED')
        expect(driftCode).toBe('GATE_3_SEAL_DRIFT')
    })

    it('runCompile and gate0Verify seal the 11-entity wiregrass-basin canon corpus cleanly', () => {
        const model = new CompileModel()
        let cleanExit = false
        let totalEntities = 0

        gate0Verify(model, {
            idx: 'gate0-verify',
            dat: {
                seriesSlug: 'wiregrass-basin',
                corpus: WIREGRASS_BASIN_CANON_CORPUS,
            },
            slv: (res) => {
                cleanExit = Boolean(res.resBit?.cleanExit)
                totalEntities = res.resBit?.catalogSummary?.totalEntities ?? 0
            },
        })

        expect(cleanExit).toBe(true)
        expect(totalEntities).toBe(11)
        expect(model.status).toBe('SEALED')
        expect(model.catalogSummary).toEqual({
            characterCount: 3,
            locationCount: 3,
            possessionCount: 3,
            grievanceCount: 2,
            totalEntities: 11,
        })
    })
})
