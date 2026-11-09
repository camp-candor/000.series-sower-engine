import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MenuModel } from './menu.model.js'
import {
    initMenu,
    updateMenu,
    selectMenuOptionAction,
    MENU_CHOICES,
} from './buz/00.menu.buzz.js'
import { SELECT_MENU_OPTION } from './menu.action.js'
import { reducer } from './menu.reduce.js'

describe('98.menu.unit - Blessed Terminal Flight Deck Switchboard Battery', () => {
    let model: MenuModel
    let mockState: any
    let huntedActions: string[]

    beforeEach(async () => {
        model = new MenuModel()
        huntedActions = []
        mockState = {
            hunt: vi.fn(async (actionType: string) => {
                huntedActions.push(actionType)
                return {}
            }),
        }
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
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
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Update Grid')) {
                    return { grdBit: { dat: { grid: true } } }
                }
                if (actionType.includes('Open Choice')) {
                    return {
                        chcBit: { src: '[01] BOOT ENGINE & ENSURE SCHEMA' },
                    }
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

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
    scanCompiledUniverses,
    validateUniverseManifestShape,
} from './buz/00.menu.buzz.js'

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
