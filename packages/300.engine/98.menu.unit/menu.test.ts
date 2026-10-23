import { describe, it, expect, vi } from 'vitest'
import sim from '../hunt'
import * as ActMnu from './menu.action'
import { MENU_CHOICES, MENU_DESCRIPTIONS } from './buz/00.menu.buzz'

describe('98.menu.unit - Blessed Terminal Menu Flight Deck Suite', () => {
    it('should define exactly 10 canonical menu choices with matching descriptions', () => {
        expect(MENU_CHOICES.length).toBe(10)
        for (const choice of MENU_CHOICES) {
            expect(MENU_DESCRIPTIONS[choice]).toBeDefined()
            expect(typeof MENU_DESCRIPTIONS[choice]).toBe('string')
            expect(MENU_DESCRIPTIONS[choice].length).toBeGreaterThan(10)
        }
    })

    it('should degrade cleanly via HEADLESS_BYPASS when terminal screen is absent', async () => {
        // In headless test environments, globalThis.LIBRARY is undefined
        const initRes: any = await sim.hunt(ActMnu.INIT_MENU, {})
        expect(initRes).toBeDefined()
        expect(initRes.mnuBit.idx).toBe('init-menu-headless')

        const updateRes: any = await sim.hunt(ActMnu.UPDATE_MENU, {})
        expect(updateRes).toBeDefined()
        expect(updateRes.mnuBit.idx).toBe('update-menu-headless')
        expect(updateRes.mnuBit.src).toBe('HEADLESS_BYPASS')
    })

    it('should simulate interactive menu selection with mocked Blessed library primitives', async () => {
        const mockConsoleOutput: string[] = []

        // Mock Blessed harness interface
        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn().mockImplementation((action: string, bale: any) => {
                if (action === '[Grid action] Update Grid') {
                    return Promise.resolve({
                        grdBit: {
                            dat: {
                                left: 0,
                                top: 0,
                                width: '33%',
                                height: '100%',
                            },
                        },
                    })
                }
                if (action === '[Write action] Write Console') {
                    return Promise.resolve({ cnsBit: { idx: 'write-console' } })
                }
                if (action === '[Console action] Update Console') {
                    mockConsoleOutput.push(bale.src)
                    return Promise.resolve({
                        cnsBit: { idx: 'update-console' },
                    })
                }
                if (action === '[Open action] Open Choice') {
                    // Emulate selecting Option [2]
                    return Promise.resolve({
                        chcBit: {
                            src: '[2] INSPECT 4-VECTOR STATE & SQLITE TABLES',
                            val: 1,
                        },
                    })
                }
                return Promise.resolve({})
            }),
        }

        const updateRes: any = await sim.hunt(ActMnu.UPDATE_MENU, {})
        expect(updateRes).toBeDefined()

        // Verify console received structured ASCII logs
        expect(mockConsoleOutput.length).toBeGreaterThan(0)
        expect(
            mockConsoleOutput.some((log) => log.includes('STATUS_ENGINE')),
        ).toBe(true)

        // Clean up mock
        delete (globalThis as any).LIBRARY
    })

    it('should verify pure 7-bit ASCII compliance across all menu labels and descriptions', () => {
        const nonAsciiRegex = /[\x80-\xFF]/
        for (const choice of MENU_CHOICES) {
            expect(nonAsciiRegex.test(choice)).toBe(false)
            expect(nonAsciiRegex.test(MENU_DESCRIPTIONS[choice])).toBe(false)
        }
    })

    it('should execute option [6] and option [3] flows and produce mandated transcripts', async () => {
        const mockConsoleOutput: string[] = []

        ;(globalThis as any).LIBRARY = {
            hunt: vi.fn().mockImplementation((action: string, bale: any) => {
                if (action === '[Grid action] Update Grid') {
                    return Promise.resolve({ grdBit: { dat: {} } })
                }
                if (action === '[Write action] Write Console') {
                    return Promise.resolve({ cnsBit: { idx: 'write-console' } })
                }
                if (action === '[Console action] Update Console') {
                    mockConsoleOutput.push(bale.src)
                    return Promise.resolve({
                        cnsBit: { idx: 'update-console' },
                    })
                }
                if (action === '[Open action] Open Choice') {
                    return Promise.resolve({
                        chcBit: {
                            src: '[6] MUTATE LEVERAGE STRINGS / GRIEVANCE / CLOCK',
                            val: 5,
                        },
                    })
                }
                return Promise.resolve({})
            }),
        }

        await sim.hunt(ActMnu.UPDATE_MENU, {})

        expect(
            mockConsoleOutput.some((log) =>
                log.includes(
                    '>> [GRIEVANCE:UPSERT] grv_silver_spoon_grease [ACTIVE] Depth: 1 | CD: 0',
                ),
            ),
        ).toBe(true)
        expect(
            mockConsoleOutput.some((log) =>
                log.includes(
                    '>> [GRIEVANCE:ESCALATE] grv_silver_spoon_grease -> Depth 2 (8500 bps) [SIMMERING]',
                ),
            ),
        ).toBe(true)
        expect(
            mockConsoleOutput.some((log) =>
                log.includes(
                    '>> [PARANOIA:TICK] clk_attic_surveillance: 8400/8000 bps [!] BOIL-OVER TRIPPED',
                ),
            ),
        ).toBe(true)

        // Now emulate selecting Option [3]
        ;(globalThis as any).LIBRARY.hunt = vi
            .fn()
            .mockImplementation((action: string, bale: any) => {
                if (action === '[Grid action] Update Grid') {
                    return Promise.resolve({ grdBit: { dat: {} } })
                }
                if (action === '[Write action] Write Console') {
                    return Promise.resolve({ cnsBit: { idx: 'write-console' } })
                }
                if (action === '[Console action] Update Console') {
                    mockConsoleOutput.push(bale.src)
                    return Promise.resolve({
                        cnsBit: { idx: 'update-console' },
                    })
                }
                if (action === '[Open action] Open Choice') {
                    return Promise.resolve({
                        chcBit: {
                            src: '[3] ADVANCE LOGICAL TICK & DECAY SWEEP',
                            val: 2,
                        },
                    })
                }
                return Promise.resolve({})
            })

        await sim.hunt(ActMnu.UPDATE_MENU, {})

        expect(
            mockConsoleOutput.some((log) =>
                log.includes(
                    '>> [PARANOIA:DECAY] Decayed 1 active pressure meter(s)',
                ),
            ),
        ).toBe(true)
        expect(
            mockConsoleOutput.some((log) =>
                log.includes(
                    ':: [RELATIONAL:OK] Relational vector synchronized. 0 floating-point violations.',
                ),
            ),
        ).toBe(true)

        delete (globalThis as any).LIBRARY
    })
})
