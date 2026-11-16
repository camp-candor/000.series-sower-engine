import { describe, it, expect, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
    MenuModel,
    MAIN_MENU_CHOICES,
    RESET_ENGINE_VOID_STATE_LABEL,
} from '../menu.model.js'
import {
    runEngineTabulaRasaMenu,
    TRIPLE_LOCK_STAGE_1_CHOICES,
    TRIPLE_LOCK_STAGE_2_CHOICES,
    TRIPLE_LOCK_STAGE_3_CHOICES,
} from '../buz/reset-menu.buzz.js'
import {
    TABULA_RASA_TOKEN_1,
    TABULA_RASA_TOKEN_2,
    TABULA_RASA_TOKEN_3,
} from '../fce/tabula-rasa.interface.js'

describe('Phase 5: Triple-Lock Fail-Closed Terminal Confirmation Gate', () => {
    const tempDirs: string[] = []

    afterEach(() => {
        delete (globalThis as any).LIBRARY
        while (tempDirs.length > 0) {
            const dir = tempDirs.pop()!
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

    function seedDirtySandbox(): string {
        const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-lock-'))
        tempDirs.push(sandbox)
        fs.mkdirSync(path.join(sandbox, 'compiled', 'gotham-trinity-crisis'), {
            recursive: true,
        })
        fs.writeFileSync(
            path.join(
                sandbox,
                'compiled',
                'gotham-trinity-crisis',
                'bible-state.json',
            ),
            '{"seriesSlug":"gotham-trinity-crisis"}',
            'utf8',
        )
        fs.mkdirSync(path.join(sandbox, 'drafts'), { recursive: true })
        fs.writeFileSync(
            path.join(sandbox, 'drafts', 'active_scene.fountain'),
            'EXT. GOTHAM ROOFTOP - NIGHT\n',
            'utf8',
        )
        return sandbox
    }

    it('registers [99] RESET ENGINE & LEDGER TO VOID STATE in MAIN_MENU_CHOICES and defaults Index 0 to [NO]', () => {
        expect(MAIN_MENU_CHOICES).toContain(RESET_ENGINE_VOID_STATE_LABEL)
        expect(TRIPLE_LOCK_STAGE_1_CHOICES[0]).toMatch(/^\[NO\]/)
        expect(TRIPLE_LOCK_STAGE_2_CHOICES[0]).toMatch(/^\[NO\]/)
        expect(TRIPLE_LOCK_STAGE_2_CHOICES[1]).toMatch(/^\[NO\]/)
        expect(TRIPLE_LOCK_STAGE_3_CHOICES[0]).toMatch(/^\[NO\]/)
    })

    it('fails closed in interactive TUI mode if Stage 1, Stage 2, or Stage 3 is declined or escaped', async () => {
        const sandbox = seedDirtySandbox()
        const model = new MenuModel()

        // Simulate accidental default Enter at Stage 2 (Index 0 = [NO])
        let callIndex = 0
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (actionType: string) => {
                if (actionType === '[Grid action] Update Grid') {
                    return {
                        grdBit: {
                            dat: {
                                left: '0%',
                                top: '33.33%',
                                width: '33.33%',
                                height: '66.66%',
                            },
                        },
                    }
                }
                if (actionType === '[Open action] Open Choice') {
                    callIndex++
                    if (callIndex === 1) {
                        return {
                            chcBit: {
                                src: TRIPLE_LOCK_STAGE_1_CHOICES[1],
                                val: 1,
                            },
                        }
                    }
                    // Stage 2 accidental Enter selects Index 0 ([NO])
                    return {
                        chcBit: {
                            src: TRIPLE_LOCK_STAGE_2_CHOICES[0],
                            val: 0,
                        },
                    }
                }
                return {}
            }),
        }

        let resolved: any = null
        await runEngineTabulaRasaMenu(model, {
            idx: 'test-abort-stage-2',
            dat: { baseDir: sandbox },
            slv: (res: any) => {
                resolved = res?.mnuBit
            },
        })

        expect(resolved?.idx).toBe('reset-void-state-aborted')
        expect(resolved?.val).toBe(0)
        expect(resolved?.dat?.abortedAtStage).toBe(2)
        // Verify zero files were deleted
        expect(
            fs.existsSync(
                path.join(sandbox, 'drafts', 'active_scene.fountain'),
            ),
        ).toBe(true)
    })

    it('clears all three interactive TUI stages when deliberate selections are made and purges to Void State', async () => {
        const sandbox = seedDirtySandbox()
        const model = new MenuModel()
        let stageCounter = 0

        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn(async (actionType: string) => {
                if (actionType === '[Grid action] Update Grid') {
                    return {
                        grdBit: {
                            dat: {
                                left: '0%',
                                top: '33.33%',
                                width: '33.33%',
                                height: '66.66%',
                            },
                        },
                    }
                }
                if (actionType === '[Open action] Open Choice') {
                    stageCounter++
                    if (stageCounter === 1) {
                        return {
                            chcBit: {
                                src: TRIPLE_LOCK_STAGE_1_CHOICES[1],
                                val: 1,
                            },
                        }
                    }
                    if (stageCounter === 2) {
                        return {
                            chcBit: {
                                src: TRIPLE_LOCK_STAGE_2_CHOICES[2],
                                val: 2,
                            },
                        }
                    }
                    return {
                        chcBit: {
                            src: TRIPLE_LOCK_STAGE_3_CHOICES[1],
                            val: 1,
                        },
                    }
                }
                return {}
            }),
        }

        const mockState = { hunt: vi.fn(async () => ({})) } as any
        let resolved: any = null

        await runEngineTabulaRasaMenu(
            model,
            {
                idx: 'test-full-unlock',
                dat: { baseDir: sandbox },
                slv: (res: any) => {
                    resolved = res?.mnuBit
                },
            },
            mockState,
        )

        expect(stageCounter).toBe(3)
        expect(resolved?.idx).toBe('engine-tabula-rasa-pass')
        expect(resolved?.val).toBe(1)
        expect(resolved?.dat?.voidStateVerified).toBe(true)
        expect(
            fs.existsSync(
                path.join(sandbox, 'drafts', 'active_scene.fountain'),
            ),
        ).toBe(false)
    })

    it('enforces strict three-token verification in headless agent mode', async () => {
        const sandbox = seedDirtySandbox()
        const model = new MenuModel()
        const mockState = { hunt: vi.fn(async () => ({})) } as any

        // Missing token 3 -> fails closed
        let aborted: any = null
        await runEngineTabulaRasaMenu(
            model,
            {
                idx: 'headless-partial',
                dat: {
                    tabulaRasaRequest: {
                        baseDir: sandbox,
                        confirmToken1: TABULA_RASA_TOKEN_1,
                        confirmToken2: TABULA_RASA_TOKEN_2,
                    },
                },
                slv: (res: any) => {
                    aborted = res?.mnuBit
                },
            },
            mockState,
        )
        expect(aborted?.idx).toBe('reset-void-state-aborted')
        expect(aborted?.dat?.abortedAtStage).toBe(3)

        // All 3 tokens valid -> executes full reset
        let passed: any = null
        await runEngineTabulaRasaMenu(
            model,
            {
                idx: 'headless-valid',
                dat: {
                    tabulaRasaRequest: {
                        baseDir: sandbox,
                        confirmToken1: TABULA_RASA_TOKEN_1,
                        confirmToken2: TABULA_RASA_TOKEN_2,
                        confirmToken3: TABULA_RASA_TOKEN_3,
                    },
                },
                slv: (res: any) => {
                    passed = res?.mnuBit
                },
            },
            mockState,
        )
        expect(passed?.idx).toBe('engine-tabula-rasa-pass')
        expect(passed?.val).toBe(1)
        expect(passed?.dat?.voidStateVerified).toBe(true)
    })
})
