import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { MenuModel, MAIN_MENU_CHOICES } from '../menu.model.js'
import { MENU_CHOICES, selectMenuOptionAction } from '../buz/00.menu.buzz.js'
import {
    stageSpatialHeaderWithFountainEditor,
    compileFullFountainDraftToAst,
    exportFountainAndAstToConductor,
} from '../buz/fountain-workflow-menu.buzz.js'
import {
    tokenizeFountainDialogue,
    runSeriesFountainPreflightGate,
    coerceBibleStateToCompileCorpus,
} from '../../21.compile.unit/buz/parallax-preflight.buzz.js'
import {
    sanitizeFountainToAscii,
    promoteEmbeddedDialogueCues,
    validateFountainIngress,
} from '../../21.compile.unit/buz/fountain-ingress.buzz.js'

describe('Task 5: Full-Scene Fountain Screenplay Editor, Multi-Turn Tokenizer, Plus Disk Exporter', () => {
    let tmpDir: string
    let conductorDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-fountain-task5-'))
        conductorDir = path.join(tmpDir, '000.series-sower-conductor')
        fs.mkdirSync(conductorDir, { recursive: true })

        const gothamCompiledDir = path.join(
            tmpDir,
            'compiled',
            'gotham-trinity-crisis',
        )
        fs.mkdirSync(gothamCompiledDir, { recursive: true })
        fs.writeFileSync(
            path.join(gothamCompiledDir, 'bible-state.json'),
            JSON.stringify(
                {
                    series_slug: 'gotham-trinity-crisis',
                    root_merkle_hash: 'b'.repeat(64),
                    entities: {
                        characters: {
                            char_bruce_wayne: {
                                id: 'char_bruce_wayne',
                                name: 'Bruce Wayne',
                                vocalCue: 'BRUCE',
                                available_arms: 2,
                                available_legs: 2,
                                locomotion_tier: 'BIPEDAL_STANDARD',
                                banned_kinetic_verbs: ['FREEZE_POSTURE'],
                            },
                            char_diana_prince: {
                                id: 'char_diana_prince',
                                name: 'Diana Prince',
                                vocalCue: 'DIANA',
                                available_arms: 2,
                                available_legs: 2,
                                locomotion_tier: 'BIPEDAL_STANDARD',
                                banned_kinetic_verbs: ['SLOUCH'],
                            },
                            char_clark_kent: {
                                id: 'char_clark_kent',
                                name: 'Clark Kent',
                                vocalCue: 'CLARK',
                                available_arms: 2,
                                available_legs: 1,
                                locomotion_tier: 'BIPEDAL_LIMPING',
                                banned_kinetic_verbs: ['SPRINT', 'LEAP'],
                            },
                        },
                        locations: {
                            loc_watchtower_bridge: {
                                id: 'loc_watchtower_bridge',
                                name: 'Watchtower Command Bridge',
                                acoustic_dampening_cdb: 1650,
                                adjacent_to: ['loc_hangar_bay'],
                            },
                            loc_hangar_bay: {
                                id: 'loc_hangar_bay',
                                name: 'Hangar Bay',
                                acoustic_dampening_cdb: 900,
                                adjacent_to: ['loc_watchtower_bridge'],
                            },
                        },
                        possessions: {
                            item_kryptonite_shard: {
                                id: 'item_kryptonite_shard',
                                name: 'Lead-Lined Kryptonite Shard',
                                owner_id: 'char_bruce_wayne',
                            },
                        },
                        grievances: {
                            grv_containment_protocol: {
                                id: 'grv_containment_protocol',
                                title: 'Containment Protocol Dispute',
                                participants: [
                                    'char_bruce_wayne',
                                    'char_clark_kent',
                                ],
                                intensity_bp: 6400,
                            },
                        },
                    },
                },
                null,
                2,
            ),
            'utf8',
        )
    })

    afterEach(() => {
        vi.restoreAllMocks()
        delete (globalThis as any).LIBRARY
        delete (globalThis as any).ACTIVE_BIBLE_STATE
        delete (globalThis as any).ACTIVE_SERIES_SLUG
        delete (globalThis as any).INGESTED_BIBLE_STATES
        delete (globalThis as any).LAST_STAGED_FOUNTAIN_PATH
        delete (globalThis as any).LAST_COMPILED_AST_PATH
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })

    it('exposes menu items [18], [20], and [21] in both MENU_CHOICES and MAIN_MENU_CHOICES', () => {
        expect(MENU_CHOICES).toContain(
            '[18] STAGE SPATIAL HEADER WITH FOUNTAIN SCREENPLAY EDITOR',
        )
        expect(MENU_CHOICES).toContain(
            '[20] COMPILE FULL FOUNTAIN DRAFT TO DIALOGUE AST',
        )
        expect(MENU_CHOICES).toContain('[21] EXPORT TO CONDUCTOR')

        expect(MAIN_MENU_CHOICES).toContain(
            '[18] STAGE SPATIAL HEADER WITH FOUNTAIN SCREENPLAY EDITOR',
        )
        expect(MAIN_MENU_CHOICES).toContain(
            '[20] COMPILE FULL FOUNTAIN DRAFT TO DIALOGUE AST',
        )
        expect(MAIN_MENU_CHOICES).toContain('[21] EXPORT TO CONDUCTOR')
    })

    it('generalizes Fountain preflight and multi-turn tokenizer for any multi-character series corpus', () => {
        const rawManifest = JSON.parse(
            fs.readFileSync(
                path.join(
                    tmpDir,
                    'compiled',
                    'gotham-trinity-crisis',
                    'bible-state.json',
                ),
                'utf8',
            ),
        )
        const corpus = coerceBibleStateToCompileCorpus(rawManifest)
        expect(corpus.characters).toHaveLength(3)

        const customScript = [
            'Title: GOTHAM TRINITY CRISIS - SCENE 01',
            '',
            '===',
            '',
            'INT. WATCHTOWER COMMAND BRIDGE - NIGHT',
            '',
            'Bruce steps toward the console. "Report the sector telemetry immediately."',
            '',
            'DIANA',
            '(steady, unyielding)',
            'The outer perimeter holds.',
            '',
            'CLARK',
            '(favoring his injured leg)',
            'Do not unseal that lead vault.',
            '',
            "BRUCE (CONT'D)",
            'The protocol stays active.',
        ].join('\n')

        const sanitized = sanitizeFountainToAscii(customScript)
        const promoted = promoteEmbeddedDialogueCues(sanitized.text, [
            { inlineName: 'Bruce', cue: 'BRUCE' },
            { inlineName: 'Diana', cue: 'DIANA' },
            { inlineName: 'Clark', cue: 'CLARK' },
        ])
        expect(promoted.promotedCueCount).toBe(1)

        const ingress = validateFountainIngress(
            promoted.text,
            sanitized.transliteratedCount,
            promoted.promotedCueCount,
            { allowAnyTitle: true },
        )
        expect(ingress.valid).toBe(true)

        const summary = tokenizeFountainDialogue(promoted.text)
        expect(summary.totalTurns).toBe(4)
        expect(summary.speakerTurns).toEqual({
            BRUCE: 2,
            DIANA: 1,
            CLARK: 1,
        })

        const preflight = runSeriesFountainPreflightGate(promoted.text, corpus)
        expect(preflight.valid).toBe(true)
        expect(preflight.characterTurns).toEqual({
            char_bruce_wayne: 2,
            char_diana_prince: 1,
            char_clark_kent: 1,
        })
    })

    it('[18] stages Line 0 Spatial Stage Header with room coordinates, acoustic floor, somatic masks, duel outcome, multi-character dialogue, and invokes EDIT_TERMINAL', async () => {
        const huntedCalls: Array<{ action: string; payload: any }> = []
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (action: string, payload: any) => {
                huntedCalls.push({ action, payload })
                if (action === '[Terminal action] Edit Terminal') {
                    return {
                        trmBit: {
                            idx: 'edit-terminal',
                            src: payload.src,
                            val: 0,
                        },
                    }
                }
                return { cnsBit: { idx: 'cns00' } }
            }),
        }

        const menuModel = new MenuModel()
        const staged = await stageSpatialHeaderWithFountainEditor(menuModel, {
            dat: {
                baseDir: tmpDir,
                seriesSlug: 'gotham-trinity-crisis',
            },
        })

        expect(staged.seriesSlug).toBe('gotham-trinity-crisis')
        expect(staged.editorInvoked).toBe(true)
        expect(staged.editorResultIdx).toBe('edit-terminal')
        expect(fs.existsSync(staged.draftPath)).toBe(true)
        expect(fs.existsSync(staged.activeDraftPath)).toBe(true)

        const editCall = huntedCalls.find(
            (c) => c.action === '[Terminal action] Edit Terminal',
        )
        expect(editCall).toBeDefined()
        expect(editCall?.payload.src).toBe(staged.draftPath)

        // Verify Line 0 Spatial Stage Header contents
        expect(staged.stagedContent).toContain('[SPATIAL_STAGE_HEADER]')
        expect(staged.stagedContent).toContain(
            'ROOM_COORDINATES: origin=(0,0) bounds=[q:-10..10, r:-10..10]',
        )
        expect(staged.stagedContent).toContain('ACOUSTIC_FLOOR_CDB: 1650 cdB')
        expect(staged.stagedContent).toContain('SOMATIC_MASK[char_bruce_wayne]')
        expect(staged.stagedContent).toContain(
            'SOMATIC_MASK[char_diana_prince]',
        )
        expect(staged.stagedContent).toContain('SOMATIC_MASK[char_clark_kent]')
        expect(staged.stagedContent).toContain(
            'DUEL_OUTCOME[grv_containment_protocol]: char_bruce_wayne vs char_diana_prince',
        )

        // Verify dialogue turns exist for all 3 characters in the scene
        const tokenized = tokenizeFountainDialogue(staged.stagedContent)
        expect(tokenized.totalTurns).toBeGreaterThanOrEqual(6)
        expect(tokenized.speakerTurns['BRUCE']).toBeGreaterThanOrEqual(1)
        expect(tokenized.speakerTurns['DIANA']).toBeGreaterThanOrEqual(1)
        expect(tokenized.speakerTurns['CLARK']).toBeGreaterThanOrEqual(1)
    })

    it('[20] sanitizes UTF-8 draft, loops every turn through 01.actor.unit & 11.belief.unit, verifies verbatim parity, and writes drafts/dialogue_ast.json', async () => {
        const menuModel = new MenuModel()
        const staged = await stageSpatialHeaderWithFountainEditor(menuModel, {
            dat: {
                baseDir: tmpDir,
                seriesSlug: 'gotham-trinity-crisis',
            },
        })

        // Simulate author editing the staged Fountain file with UTF-8 smart quotes & em-dashes
        const editedWithUtf8 =
            staged.stagedContent +
            '\nBRUCE\n(quietly)\nWe\u2019re holding the bridge\u2014nobody leaves.\n'
        fs.writeFileSync(staged.draftPath, editedWithUtf8, 'utf8')

        const compiled = await compileFullFountainDraftToAst(menuModel, {
            dat: {
                baseDir: tmpDir,
                seriesSlug: 'gotham-trinity-crisis',
                fountainPath: staged.draftPath,
            },
        })

        expect(compiled.valid).toBe(true)
        expect(compiled.asciiClean).toBe(true)
        expect(compiled.transliteratedCount).toBeGreaterThanOrEqual(2)
        expect(compiled.verbatimParityOk).toBe(true)
        expect(compiled.sensoryGatePassed).toBe(true)
        expect(compiled.turnCount).toBe(7)
        expect(compiled.dualFieldBeats).toHaveLength(7)
        expect(compiled.leakReceipts).toHaveLength(7)
        expect(fs.existsSync(compiled.outputAstPath)).toBe(true)

        const savedAst = JSON.parse(
            fs.readFileSync(compiled.outputAstPath, 'utf8'),
        )
        expect(savedAst.scene_id).toBe('ep01_sc01')
        expect(savedAst.state_snapshot_hash).toBe('b'.repeat(64))
        expect(savedAst.lines).toHaveLength(7)
        expect(savedAst.lines[6].speaker_id).toBe('char_bruce_wayne')
        expect(savedAst.lines[6].dialogue_clean_ascii).toBe(
            "We're holding the bridge--nobody leaves.",
        )
    })

    it('[21] exports finalized .fountain and dialogue_ast.json to 000.series-sower-conductor ingress and drafts directories', async () => {
        const mockState: any = {
            hunt: vi.fn(async () => ({})),
        }
        const menuModel = new MenuModel()
        menuModel.activeSeriesSlug = 'gotham-trinity-crisis'

        await selectMenuOptionAction(
            menuModel,
            {
                idx: 'select-18',
                dat: {
                    selection:
                        '[18] STAGE SPATIAL HEADER WITH FOUNTAIN SCREENPLAY EDITOR',
                    baseDir: tmpDir,
                },
            } as any,
            mockState,
        )

        await selectMenuOptionAction(
            menuModel,
            {
                idx: 'select-20',
                dat: {
                    selection:
                        '[20] COMPILE FULL FOUNTAIN DRAFT TO DIALOGUE AST',
                    baseDir: tmpDir,
                },
            } as any,
            mockState,
        )

        const exported = await exportFountainAndAstToConductor(
            menuModel,
            {
                dat: {
                    baseDir: tmpDir,
                    conductorRoot: conductorDir,
                },
            },
            mockState,
        )

        expect(exported.ok).toBe(true)
        expect(exported.seriesSlug).toBe('gotham-trinity-crisis')
        expect(exported.turnCount).toBe(6)

        for (const fPath of exported.exportedFountainPaths) {
            expect(fs.existsSync(fPath)).toBe(true)
            const content = fs.readFileSync(fPath, 'utf8')
            expect(content).toContain('[SPATIAL_STAGE_HEADER]')
            for (let i = 0; i < content.length; i += 1) {
                expect(content.charCodeAt(i)).toBeLessThanOrEqual(127)
            }
        }

        for (const astPath of exported.exportedAstPaths) {
            expect(fs.existsSync(astPath)).toBe(true)
            const astJson = JSON.parse(fs.readFileSync(astPath, 'utf8'))
            expect(astJson.lines).toHaveLength(6)
            expect(astJson.state_snapshot_hash).toBe('b'.repeat(64))
        }
    })
})
