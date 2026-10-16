import { describe, it, expect } from 'vitest'
import { getCharacterSomaticMask } from '../../src/core/canon/somaticMask.js'
import {
    compileEpistemicDirectives,
    verifyClueLemmaDisjointness,
} from '../../src/core/epistemics/horizon.js'
import { lintDialogueAstSomaticInvariants } from '../../src/core/linter/somaticPanopticon.js'
import {
    DialogueAstSchema,
    type DialogueAst,
} from '../../src/types/dialogueAst.js'

describe('Phase 5: Somatic & Epistemic Boundaries', () => {
    it('correctly projects negative motor masks from somatic trauma', () => {
        const limping = getCharacterSomaticMask({
            armsAvailable: 1,
            locomotionTier: 'LIMPING',
            openWounds: [],
        })

        expect(limping.bannedKineticVerbs.has('SPRINT')).toBe(true)
        expect(limping.bannedKineticVerbs.has('BIMANUAL_CLIMB')).toBe(true)
        expect(limping.movementBudgetUnits).toBe(400)
    })

    it('bans all action for departed actors at zero movement budget', () => {
        const departed = getCharacterSomaticMask({
            armsAvailable: 0,
            locomotionTier: 'IMMOBILIZED',
            openWounds: [],
            status: 'departed',
        })
        expect(departed.bannedKineticVerbs.has('*')).toBe(true)
        expect(departed.movementBudgetUnits).toBe(0)

        const immobilized = getCharacterSomaticMask({
            armsAvailable: 2,
            locomotionTier: 'IMMOBILIZED',
            openWounds: [],
        })
        expect(immobilized.movementBudgetUnits).toBe(0)
        expect(immobilized.bannedKineticVerbs.has('WALK')).toBe(true)

        const armless = getCharacterSomaticMask({
            armsAvailable: 0,
            locomotionTier: 'UNRESTRICTED',
            openWounds: [],
        })
        expect(armless.bannedKineticVerbs.has('GRASP')).toBe(true)
        expect(armless.movementBudgetUnits).toBe(1000)
    })

    it('enforces ignorance by omission and clue-lemma disjointness', () => {
        const directive = compileEpistemicDirectives(
            'char_bog',
            'mystery_famine',
            'TOTAL_IGNORANCE',
        )
        expect(directive.omittedTopicIds).toContain('mystery_famine')
        expect(directive.injectedDirectives.length).toBe(0)

        const unresolved = compileEpistemicDirectives(
            'char_bog',
            'mystery_famine',
            'UNRESOLVED_BY_CANON',
        )
        expect(unresolved.omittedTopicIds).toContain('mystery_famine')
        expect(unresolved.injectedDirectives[0]).toContain('CANONICAL TABOO')

        const withheld = compileEpistemicDirectives(
            'char_bog',
            'mystery_famine',
            'WITHHELD',
        )
        expect(withheld.omittedTopicIds).toHaveLength(0)
        expect(withheld.injectedDirectives[0]).toContain('RESTRAINED KNOWLEDGE')

        const validDisjoint = verifyClueLemmaDisjointness({
            permittedClues: ['copper_wire', 'rust'],
            triggerLemmas: ['poisoned_well', 'sabotage'],
        })
        expect(validDisjoint).toBe(true)

        const invalidOverlap = verifyClueLemmaDisjointness({
            permittedClues: ['poisoned_well', 'residue'],
            triggerLemmas: ['poisoned_well', 'sabotage'],
        })
        expect(invalidOverlap).toBe(false)

        const caseOverlap = verifyClueLemmaDisjointness({
            permittedClues: ['Poisoned_Well'],
            triggerLemmas: ['poisoned_well'],
        })
        expect(caseOverlap).toBe(false)
    })

    it('validates the dialogue AST egress schema bounds', () => {
        const parsed = DialogueAstSchema.parse({
            sceneId: 'sc_01',
            episodeNum: 1,
            beats: [
                {
                    beatId: 'b1',
                    speakerId: 'char_silas',
                    lines: 'Hold this valve.',
                    tensionBps: 4000,
                },
            ],
        })
        expect(parsed.beats[0].kineticVerbs).toEqual([])
        expect(parsed.beats[0].heldItems).toEqual([])

        expect(() =>
            DialogueAstSchema.parse({
                sceneId: 'sc_01',
                episodeNum: 1,
                beats: [
                    {
                        beatId: 'b1',
                        speakerId: 'char_silas',
                        lines: 'Too tense.',
                        tensionBps: 10001,
                    },
                ],
            }),
        ).toThrow()
    })

    it('catches somatic breaches and hand capacity overreach at T0', () => {
        const ast: DialogueAst = {
            sceneId: 'sc_01',
            episodeNum: 1,
            beats: [
                {
                    beatId: 'b1',
                    speakerId: 'char_silas',
                    lines: 'Hold this valve.',
                    tensionBps: 4000,
                    kineticVerbs: ['SPRINT'],
                    heldItems: ['wrench', 'pipe'],
                },
            ],
        }

        const projections = {
            char_silas: {
                projection: getCharacterSomaticMask({
                    armsAvailable: 1,
                    locomotionTier: 'LIMPING',
                    openWounds: [],
                }),
                armsAvailable: 1,
            },
        }

        const result = lintDialogueAstSomaticInvariants(ast, projections)
        expect(result.valid).toBe(false)
        expect(
            result.violations.some((v) => v.code === 'HAND_CAPACITY_BREACH'),
        ).toBe(true)
        expect(
            result.violations.some((v) => v.code === 'SOMATIC_MOTOR_BREACH'),
        ).toBe(true)
    })

    it('passes a physically lawful AST with zero violations', () => {
        const ast: DialogueAst = {
            sceneId: 'sc_02',
            episodeNum: 1,
            beats: [
                {
                    beatId: 'b1',
                    speakerId: 'char_wart',
                    lines: 'Steady now.',
                    tensionBps: 1000,
                    kineticVerbs: ['WALK'],
                    heldItems: ['wrench'],
                },
            ],
        }
        const projections = {
            char_wart: {
                projection: getCharacterSomaticMask({
                    armsAvailable: 2,
                    locomotionTier: 'UNRESTRICTED',
                    openWounds: [],
                }),
                armsAvailable: 2,
            },
        }
        const result = lintDialogueAstSomaticInvariants(ast, projections)
        expect(result.valid).toBe(true)
        expect(result.violations).toHaveLength(0)
    })
})
