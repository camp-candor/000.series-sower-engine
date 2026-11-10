import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { MenuModel } from './menu.model.js'
import {
    initMenu,
    updateMenu,
    selectMenuOptionAction,
    MENU_CHOICES,
    calculateSubmenuSpan,
    promptAirlockUniverseSelection,
    scanCompiledUniverses,
    validateUniverseManifestShape,
    loadAndFreezeUniverseManifest,
    handleMenuSelection,
} from './buz/00.menu.buzz.js'
import { deepFreezePayload } from './buz/deepFreeze.buzz.js'
import * as ActEng from '../00.engine.unit/engine.action.js'
import * as ActMnu from './menu.action.js'
import { SELECT_MENU_OPTION } from './menu.action.js'
import { reducer } from './menu.reduce.js'
import sim from '../hunt.js'

describe('98.menu.unit - Blessed Terminal Flight Deck Switchboard Battery', () => {
    let model: MenuModel
    let mockState: any
    let huntedActions: string[]
    let tempDir: string

    beforeEach(async () => {
        model = new MenuModel()
        huntedActions = []
        mockState = {
            hunt: vi.fn(async (actionType: string) => {
                huntedActions.push(actionType)
                return {}
            }),
        }
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-battery-'))
        const slugDir = path.join(tempDir, 'compiled', 'wiregrass-basin')
        fs.mkdirSync(slugDir, { recursive: true })
        fs.writeFileSync(
            path.join(slugDir, 'bible-state.json'),
            JSON.stringify({
                seriesSlug: 'wiregrass-basin',
                schemaVersion: '1.0.0',
                merkleRootHex: 'd'.repeat(64),
                entities: {
                    characters: {},
                    locations: {},
                    possessions: {},
                    grievances: {},
                },
            }),
            'utf8',
        )
        vi.spyOn(process, 'cwd').mockReturnValue(tempDir)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
        fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('initializes menu in headless mode when globalThis.LIBRARY is undefined', async () => {
        const slv = vi.fn()
        await initMenu(model, { idx: 'init-headless', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        expect(model.isHeadless).toBe(true)
    })

    it('exposes all required flight deck menu choices', () => {
        expect(MENU_CHOICES).toContain('[01] BOOT ENGINE & ENSURE SCHEMA')
        expect(MENU_CHOICES).toContain('[02] STATUS ENGINE & TABLE INVENTORY')
        expect(MENU_CHOICES).toContain('[03] AUDIT SIMULATION INVARIANTS')
        expect(MENU_CHOICES).toContain('[04] RESET ENGINE TO OFFLINE')
        expect(MENU_CHOICES).toContain(
            '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION',
        )
        expect(MENU_CHOICES).toContain(
            '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT',
        )
        expect(MENU_CHOICES).toContain(
            '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION',
        )
        expect(MENU_CHOICES).toContain(
            '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE',
        )
        expect(MENU_CHOICES).toContain(
            '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY',
        )
        expect(MENU_CHOICES).toContain(
            '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION',
        )
        expect(MENU_CHOICES).toContain(
            '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS',
        )
        expect(MENU_CHOICES).toContain('[ROOT MENU]')
    })

    it('dispatches BOOT_ENGINE when option [01] is selected', async () => {
        const slv = vi.fn()
        await selectMenuOptionAction(
            model,
            {
                idx: 'select-01',
                dat: { selection: '[01] BOOT ENGINE & ENSURE SCHEMA' },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        expect(huntedActions.some((a) => a.includes('Boot Engine'))).toBe(true)
    })

    it('dispatches COMPILE_DIALOGUE_BEAT_ACTOR when option [16] is selected', async () => {
        const slv = vi.fn()
        await selectMenuOptionAction(
            model,
            {
                idx: 'select-16',
                dat: {
                    selection:
                        '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS',
                },
                slv,
            },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        expect(
            huntedActions.some((a) =>
                a.includes('Compile Dialogue Beat Actor'),
            ),
        ).toBe(true)
    })

    it('renders choice menu via LIBRARY.hunt when interactive terminal is available', async () => {
        const libraryHunted: string[] = []
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (actionType: string, _payload: any) => {
                libraryHunted.push(actionType)
                if (actionType.includes('Update Grid')) {
                    return { grdBit: { dat: { grid: true } } }
                }
                if (actionType.includes('Open Choice')) {
                    return { chcBit: { src: '[ROOT MENU]' } }
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await updateMenu(model, { idx: 'update-terminal', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        expect(libraryHunted.some((a) => a.includes('Update Grid'))).toBe(true)
        expect(libraryHunted.some((a) => a.includes('Open Choice'))).toBe(true)
        expect(model.activeSelection).toBe('[ROOT MENU]')
    })

    it('routes SELECT_MENU_OPTION through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: SELECT_MENU_OPTION,
                bale: {
                    idx: 'reducer-select',
                    dat: { selection: '[03] AUDIT SIMULATION INVARIANTS' },
                    slv,
                } as any,
            },
            mockState,
        )) as MenuModel

        expect(result).toBeInstanceOf(MenuModel)
        expect(slv).toHaveBeenCalled()
    })

    it('streams the [03] invariant audit block without ste.hunt routing stalls', async () => {
        const libraryLines: string[] = []
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Update Grid')) {
                    return { grdBit: { dat: { grid: true } } }
                }
                if (actionType.includes('Open Choice')) {
                    return {
                        chcBit: { src: '[03] AUDIT SIMULATION INVARIANTS' },
                    }
                }
                if (actionType.includes('Update Console')) {
                    libraryLines.push(payload?.src)
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await updateMenu(model, { idx: 'update-03', slv }, mockState)

        expect(
            libraryLines.some((l) => l.includes('Dispatching AUDIT_ENGINE')),
        ).toBe(true)
        expect(
            libraryLines.some((l) =>
                l.includes('Running core simulation invariant gauntlet'),
            ),
        ).toBe(true)
        expect(
            libraryLines.some((l) =>
                l.includes('Invariants verified. Pass: true'),
            ),
        ).toBe(true)
        expect(huntedActions.some((a) => a.includes('Audit Engine'))).toBe(
            false,
        )
        expect(model.activeSelection).toBe('[03] AUDIT SIMULATION INVARIANTS')
    })

    it('executes option [01] in interactive flight deck mode without stalling', async () => {
        const libraryLines: string[] = []
        let openChoiceCalls = 0
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Update Grid')) {
                    return { grdBit: { dat: { grid: true } } }
                }
                if (actionType.includes('Open Choice')) {
                    openChoiceCalls += 1
                    if (openChoiceCalls === 1) {
                        return {
                            chcBit: { src: '[01] BOOT ENGINE & ENSURE SCHEMA' },
                        }
                    }
                    return { chcBit: { src: 'wiregrass-basin' } }
                }
                if (actionType.includes('Update Console')) {
                    libraryLines.push(payload?.src)
                }
                return {}
            }),
        }

        const slv = vi.fn()
        await updateMenu(model, { idx: 'update-01', slv }, mockState)

        expect(slv).toHaveBeenCalled()
        expect(
            libraryLines.some((l) => l.includes('Dispatching BOOT_ENGINE')),
        ).toBe(true)
        expect(huntedActions.some((a) => a.includes('Boot Engine'))).toBe(true)
        expect(model.activeSelection).toBe('[01] BOOT ENGINE & ENSURE SCHEMA')
    })
})

describe('98.menu.unit :: Local Compiled Universe Discovery (Phase 1)', () => {
    let tempDir: string

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-test-engine-'))
    })

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true })
    })

    it('validates correct manifest shape against contract', () => {
        const validManifest = {
            seriesSlug: 'wiregrass-basin',
            schemaVersion: '1.0.0',
            merkleRootHex: 'a'.repeat(64),
            entities: {
                characters: { char_bog: {} },
                locations: { loc_pipe: {} },
                possessions: { item_scraper: {} },
                grievances: { grv_impasse: {} },
            },
        }
        expect(validateUniverseManifestShape(validManifest)).toBe(true)
    })

    it('rejects manifests missing required entity collections or valid hashes', () => {
        expect(validateUniverseManifestShape(null)).toBe(false)
        expect(validateUniverseManifestShape({})).toBe(false)
        expect(
            validateUniverseManifestShape({
                seriesSlug: 'bad-hash',
                merkleRootHex: 'not-a-64-char-hex',
                entities: {
                    characters: {},
                    locations: {},
                    possessions: {},
                    grievances: {},
                },
            }),
        ).toBe(false)
        expect(
            validateUniverseManifestShape({
                seriesSlug: 'missing-grievances',
                merkleRootHex: 'b'.repeat(64),
                entities: { characters: {}, locations: {}, possessions: {} },
            }),
        ).toBe(false)
    })

    it('scans compiled/ directory and discovers valid universes while ignoring invalid ones', () => {
        const compiledPath = path.join(tempDir, 'compiled')
        fs.mkdirSync(compiledPath, { recursive: true })

        // 1. Valid universe
        const validSlugDir = path.join(compiledPath, 'wiregrass-basin')
        fs.mkdirSync(validSlugDir, { recursive: true })
        fs.writeFileSync(
            path.join(validSlugDir, 'bible-state.json'),
            JSON.stringify({
                seriesSlug: 'wiregrass-basin',
                schemaVersion: '1.0.0',
                merkleRootHex: 'c'.repeat(64),
                entities: {
                    characters: { char_bog: {} },
                    locations: { loc_pipe: {} },
                    possessions: { item_scraper: {} },
                    grievances: { grv_impasse: {} },
                },
            }),
            'utf8',
        )

        // 2. Directory without bible-state.json
        fs.mkdirSync(path.join(compiledPath, 'empty-realm'), {
            recursive: true,
        })

        // 3. Directory with corrupt JSON
        const corruptSlugDir = path.join(compiledPath, 'corrupted-realm')
        fs.mkdirSync(corruptSlugDir, { recursive: true })
        fs.writeFileSync(
            path.join(corruptSlugDir, 'bible-state.json'),
            '{ invalid-json',
            'utf8',
        )

        const discovered = scanCompiledUniverses(tempDir)
        expect(discovered).toHaveLength(1)
        expect(discovered[0].seriesSlug).toBe('wiregrass-basin')
        expect(discovered[0].merkleRootHex).toBe('c'.repeat(64))
        expect(discovered[0].hasBibleState).toBe(true)
        expect(discovered[0].byteSize).toBeGreaterThan(0)
    })
})

describe('98.menu.unit :: Terminal Airlock Submenu Selection Presentation (Phase 2)', () => {
    let tempDir: string

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-airlock-test-'))
    })

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true })
        vi.restoreAllMocks()
    })

    it('calculates dynamic grid ySpan bounded between 6 and 12', () => {
        expect(calculateSubmenuSpan(1)).toBe(6)
        expect(calculateSubmenuSpan(2)).toBe(6)
        expect(calculateSubmenuSpan(4)).toBe(6)
        expect(calculateSubmenuSpan(5)).toBe(7)
        expect(calculateSubmenuSpan(8)).toBe(10)
        expect(calculateSubmenuSpan(20)).toBe(12)
    })

    it('falls back cleanly in headless mode when no LIBRARY is present', async () => {
        const compiledPath = path.join(tempDir, 'compiled')
        const slugDir = path.join(compiledPath, 'wiregrass-basin')
        fs.mkdirSync(slugDir, { recursive: true })
        fs.writeFileSync(
            path.join(slugDir, 'bible-state.json'),
            JSON.stringify({
                seriesSlug: 'wiregrass-basin',
                schemaVersion: '1.0.0',
                merkleRootHex: 'd'.repeat(64),
                entities: {
                    characters: { char_bog: {} },
                    locations: { loc_pipe: {} },
                    possessions: { item_knife: {} },
                    grievances: { grv_impasse: {} },
                },
            }),
            'utf8',
        )

        const picked = await promptAirlockUniverseSelection(undefined, tempDir)
        expect(picked).toBe('wiregrass-basin')
    })

    it('returns null and logs error if no compiled universes exist', async () => {
        const emptyTemp = fs.mkdtempSync(
            path.join(os.tmpdir(), 'empty-compiled-'),
        )
        const picked = await promptAirlockUniverseSelection(
            undefined,
            emptyTemp,
        )
        expect(picked).toBeNull()
        fs.rmSync(emptyTemp, { recursive: true, force: true })
    })

    it('renders interactive choice list and returns picked slug when LIBRARY is present', async () => {
        const compiledPath = path.join(tempDir, 'compiled')
        for (const slug of ['blessed-and-the-bounded', 'wiregrass-basin']) {
            const slugDir = path.join(compiledPath, slug)
            fs.mkdirSync(slugDir, { recursive: true })
            fs.writeFileSync(
                path.join(slugDir, 'bible-state.json'),
                JSON.stringify({
                    seriesSlug: slug,
                    schemaVersion: '1.0.0',
                    merkleRootHex: 'e'.repeat(64),
                    entities: {
                        characters: {},
                        locations: {},
                        possessions: {},
                        grievances: {},
                    },
                }),
                'utf8',
            )
        }

        const mockHunt = vi
            .fn()
            .mockImplementation((action: string, bale: any) => {
                if (action === '[Grid action] Update Grid') {
                    return Promise.resolve({ grdBit: { dat: {} } })
                }
                if (action === '[Open action] Open Choice') {
                    expect(bale.lst).toContain('blessed-and-the-bounded')
                    expect(bale.lst).toContain('wiregrass-basin')
                    expect(bale.lst).toContain('[ABORT AIRLOCK SEQUENCE]')
                    expect(bale.dat?.clr1).toBe('green')
                    return Promise.resolve({
                        chcBit: { src: 'wiregrass-basin' },
                    })
                }
                return Promise.resolve({})
            })

        ;(globalThis as any).LIBRARY = { hunt: mockHunt }

        const selected = await promptAirlockUniverseSelection(
            undefined,
            tempDir,
        )
        expect(selected).toBe('wiregrass-basin')

        delete (globalThis as any).LIBRARY
    })

    it('handles operator abort cleanly returning null', async () => {
        const compiledPath = path.join(tempDir, 'compiled')
        const slugDir = path.join(compiledPath, 'wiregrass-basin')
        fs.mkdirSync(slugDir, { recursive: true })
        fs.writeFileSync(
            path.join(slugDir, 'bible-state.json'),
            JSON.stringify({
                seriesSlug: 'wiregrass-basin',
                schemaVersion: '1.0.0',
                merkleRootHex: 'f'.repeat(64),
                entities: {
                    characters: {},
                    locations: {},
                    possessions: {},
                    grievances: {},
                },
            }),
            'utf8',
        )

        const mockHunt = vi.fn().mockImplementation((action: string) => {
            if (action === '[Grid action] Update Grid') {
                return Promise.resolve({ grdBit: { dat: {} } })
            }
            if (action === '[Open action] Open Choice') {
                return Promise.resolve({
                    chcBit: { src: '[ABORT AIRLOCK SEQUENCE]' },
                })
            }
            return Promise.resolve({})
        })

        ;(globalThis as any).LIBRARY = { hunt: mockHunt }

        const selected = await promptAirlockUniverseSelection(
            undefined,
            tempDir,
        )
        expect(selected).toBeNull()

        delete (globalThis as any).LIBRARY
    })
})

describe('98.menu.unit :: Canon Airlock interactive switchboard (Check 12)', () => {
    let model: MenuModel
    let mockState: any
    let tempDir: string

    beforeEach(() => {
        model = new MenuModel()
        mockState = { hunt: vi.fn(async () => ({})) }
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-test-airlock-'))
        const slugDir = path.join(tempDir, 'compiled', 'wiregrass-basin')
        fs.mkdirSync(slugDir, { recursive: true })
        fs.writeFileSync(
            path.join(slugDir, 'bible-state.json'),
            JSON.stringify({
                seriesSlug: 'wiregrass-basin',
                schemaVersion: '1.0.0',
                merkleRootHex: 'd'.repeat(64),
                entities: {
                    characters: {},
                    locations: {},
                    possessions: {},
                    grievances: {},
                },
            }),
            'utf8',
        )
        vi.spyOn(process, 'cwd').mockReturnValue(tempDir)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
        fs.rmSync(tempDir, { recursive: true, force: true })
    })

    const mountAirlockLibrary = (
        libraryLines: string[],
        choiceLists: any[],
        airlockPick: string,
    ) => {
        let openChoiceCalls = 0
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Update Grid')) {
                    return { grdBit: { dat: { grid: true } } }
                }
                if (actionType.includes('Open Choice')) {
                    openChoiceCalls += 1
                    choiceLists.push(payload?.lst)
                    if (openChoiceCalls === 1) {
                        return {
                            chcBit: {
                                src: '[01] BOOT ENGINE & ENSURE SCHEMA',
                            },
                        }
                    }
                    return { chcBit: { src: airlockPick } }
                }
                if (actionType.includes('Update Console')) {
                    libraryLines.push(payload?.src)
                }
                return {}
            }),
        }
    }

    it('streams AIRLOCK tokens and seals the operator universe pick', async () => {
        const libraryLines: string[] = []
        const choiceLists: any[] = []
        mountAirlockLibrary(libraryLines, choiceLists, 'wiregrass-basin')

        const slv = vi.fn()
        await updateMenu(model, { idx: 'update-airlock-seal', slv }, mockState)

        expect(libraryLines.some((l) => l.includes('[AIRLOCK::SCAN]'))).toBe(
            true,
        )
        expect(
            libraryLines.some((l) =>
                l.includes(
                    '[AIRLOCK::FOUND] 1 sealed world artifact(s) detected:',
                ),
            ),
        ).toBe(true)
        expect(libraryLines.some((l) => l.includes('[AIRLOCK::PROMPT]'))).toBe(
            true,
        )
        expect(choiceLists[1]).toContain('wiregrass-basin')
        expect(choiceLists[1]).toContain('[ABORT AIRLOCK SEQUENCE]')
        expect(model.activeUniverseSlug).toBe('wiregrass-basin')
        expect(
            libraryLines.some((l) =>
                l.includes(
                    '[AIRLOCK::INGEST] Target selected: [wiregrass-basin]',
                ),
            ),
        ).toBe(true)
        expect(slv).toHaveBeenCalled()
    })

    it('aborts the airlock sequence and returns cleanly', async () => {
        const libraryLines: string[] = []
        const choiceLists: any[] = []
        mountAirlockLibrary(
            libraryLines,
            choiceLists,
            '[ABORT AIRLOCK SEQUENCE]',
        )

        const slv = vi.fn()
        await updateMenu(model, { idx: 'update-airlock-abort', slv }, mockState)

        expect(libraryLines.some((l) => l.includes('[AIRLOCK::ABORT]'))).toBe(
            true,
        )
        expect(model.activeUniverseSlug).toBe('')
        expect(slv).toHaveBeenCalled()
    })
})

describe('98.menu.unit :: Deep Freeze Defensive Ingestion Boundary (Phase 3)', () => {
    let tempDir: string

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-phase3-'))
    })

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true })
        vi.restoreAllMocks()
    })

    it('recursively freezes nested object hierarchies and prevents mutations', () => {
        const raw = {
            seriesSlug: 'wiregrass-basin',
            nested: { count: 42, tags: ['alpha', 'beta'] },
        }

        const frozen = deepFreezePayload(raw)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(frozen.nested)).toBe(true)
        expect(Object.isFrozen(frozen.nested.tags)).toBe(true)

        expect(() => {
            ;(frozen.nested as any).count = 99
        }).toThrow(TypeError)

        expect(() => {
            ;(frozen.nested.tags as any).push('gamma')
        }).toThrow(TypeError)
    })

    it('safely handles circular object references without call stack overflow', () => {
        const circular: any = { name: 'ouroboros' }
        circular.self = circular

        const frozen = deepFreezePayload(circular)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(frozen.self).toBe(frozen)
    })

    it('loads valid manifest, deep-freezes it, and throws on malformed JSON', () => {
        const compiledPath = path.join(tempDir, 'compiled', 'wiregrass-basin')
        fs.mkdirSync(compiledPath, { recursive: true })
        fs.writeFileSync(
            path.join(compiledPath, 'bible-state.json'),
            JSON.stringify({
                seriesSlug: 'wiregrass-basin',
                schemaVersion: '1.0.0',
                merkleRootHex: 'a'.repeat(64),
                entities: {
                    characters: { char_bog: { name: 'Bog' } },
                    locations: {},
                    possessions: {},
                    grievances: {},
                },
            }),
            'utf8',
        )

        const loaded = loadAndFreezeUniverseManifest('wiregrass-basin', tempDir)
        expect(loaded.seriesSlug).toBe('wiregrass-basin')
        expect(Object.isFrozen(loaded)).toBe(true)
        expect(Object.isFrozen(loaded.entities.characters.char_bog)).toBe(true)

        expect(() => {
            ;(loaded.entities.characters.char_bog as any).name = 'Corrupted'
        }).toThrow(TypeError)

        expect(() => {
            loadAndFreezeUniverseManifest('non-existent-realm', tempDir)
        }).toThrow(/Missing manifest at/)
    })

    it('forwards frozen in-memory bibleState across ste.hunt without disk handles', async () => {
        const compiledPath = path.join(tempDir, 'compiled', 'wiregrass-basin')
        fs.mkdirSync(compiledPath, { recursive: true })
        fs.writeFileSync(
            path.join(compiledPath, 'bible-state.json'),
            JSON.stringify({
                seriesSlug: 'wiregrass-basin',
                schemaVersion: '1.0.0',
                merkleRootHex: 'b'.repeat(64),
                entities: {
                    characters: {},
                    locations: {},
                    possessions: {},
                    grievances: {},
                },
            }),
            'utf8',
        )

        const mockHunt = vi.fn().mockResolvedValue({})
        const fakeState: any = { hunt: mockHunt }

        await handleMenuSelection(
            '[01] BOOT ENGINE & ENSURE SCHEMA',
            fakeState,
            undefined,
            tempDir,
        )

        expect(mockHunt).toHaveBeenCalledWith(
            ActEng.BOOT_ENGINE,
            expect.objectContaining({
                dat: expect.objectContaining({
                    bootParams: expect.objectContaining({
                        seriesSlug: 'wiregrass-basin',
                        seedGenesis: true,
                        bibleState: expect.any(Object),
                    }),
                }),
            }),
        )

        const callArgs = mockHunt.mock.calls.find(
            (call: any) => call[0] === ActEng.BOOT_ENGINE,
        )
        expect(callArgs).toBeDefined()
        const passedState = callArgs![1].dat.bootParams.bibleState
        expect(Object.isFrozen(passedState)).toBe(true)
    })
})

describe('packages/300.engine 98.menu.unit - Runtime Dispatch Switchboard', () => {
    beforeEach(async () => {
        // Reset to BOOT mode before each assertion
        await sim.hunt!(ActMnu.SWITCH_FLIGHT_DECK_MODE, {
            dat: { flightDeckMode: 'BOOT' },
        })
    })

    it('initializes menu in BOOT mode by default in headless runner', async () => {
        const res: any = await sim.hunt!(ActMnu.INIT_MENU, {})
        expect(res).toBeDefined()
        expect(res.mnuBit.src).toBe('HEADLESS')
    })

    it('renders BOOT_MODE options when flightDeckMode is BOOT', async () => {
        const res: any = await sim.hunt!(ActMnu.UPDATE_MENU, {})
        expect(res).toBeDefined()
        expect(res.mnuBit.src).toBe('BOOT_MODE')
    })

    it('switches to RUNTIME mode and serves runtime dispatch options', async () => {
        const switchRes: any = await sim.hunt!(ActMnu.SWITCH_FLIGHT_DECK_MODE, {
            dat: { flightDeckMode: 'RUNTIME' },
        })
        expect(switchRes.mnuBit.src).toBe('RUNTIME')

        const updateRes: any = await sim.hunt!(ActMnu.UPDATE_MENU, {})
        expect(updateRes.mnuBit.src).toBe('RUNTIME_MODE')
    })

    it('reverts back to BOOT_MODE when reset is commanded', async () => {
        await sim.hunt!(ActMnu.SWITCH_FLIGHT_DECK_MODE, {
            dat: { flightDeckMode: 'RUNTIME' },
        })

        const resetRes: any = await sim.hunt!(ActMnu.SWITCH_FLIGHT_DECK_MODE, {
            dat: { flightDeckMode: 'BOOT' },
        })
        expect(resetRes.mnuBit.src).toBe('BOOT')

        const updateRes: any = await sim.hunt!(ActMnu.UPDATE_MENU, {})
        expect(updateRes.mnuBit.src).toBe('BOOT_MODE')
    })

    it('dispatches ADVANCE_TICK without stalling when ADVANCE TICK is selected', async () => {
        const selectRes: any = await sim.hunt!(ActMnu.SELECT_MENU_OPTION, {
            dat: { selection: 'ADVANCE TICK' },
        })
        expect(selectRes).toBeDefined()
        expect(selectRes.mnuBit.src).toBe('ADVANCE TICK')
    })

    it('dispatches FAST_FORWARD_TICKS without stalling when RUN SIM GAUNTLET is selected', async () => {
        const selectRes: any = await sim.hunt!(ActMnu.SELECT_MENU_OPTION, {
            dat: { selection: 'RUN SIM GAUNTLET' },
        })
        expect(selectRes).toBeDefined()
        expect(selectRes.mnuBit.src).toBe('RUN SIM GAUNTLET')
    })
})
