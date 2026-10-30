import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    updateArithmeticMenu,
    runBasisPointBoundsAudit,
    runBankersRoundingAudit,
    runArbitraryDivisionAudit,
    runBigIntPrecisionAudit,
    runExhaustiveGauntletAudit,
    UPDATE_GRID,
    OPEN_CHOICE,
    UPDATE_CONSOLE,
    CLOSE_TERMINAL,
} from '../buz/arithmetic-menu.buzz.js'
import { updateMenu } from '../buz/00.menu.buzz.js'
import { OPEN_ARITHMETIC_MENU } from '../menu.action.js'
import { MenuModel } from '../menu.model.js'

describe('98.menu.unit - Arithmetic Menu Flight Deck', () => {
    it('resolves safely in headless mode when global.LIBRARY is absent', async () => {
        let resolvedBit: any = null
        const model = { idx: '98.menu' }
        const bale = {
            slv: (res: any) => {
                resolvedBit = res
            },
        }

        const result = await updateArithmeticMenu(model, bale)
        expect(result).toBe(model)
        expect(resolvedBit?.mnuBit?.idx).toBe('arithmetic-menu-headless')
        expect(resolvedBit?.mnuBit?.val).toBe(0)
    })

    it('passes Level 1 & 2 bounds audit via mock stream', async () => {
        const logs: string[] = []
        const mockLib = {
            hunt: async (_act: string, payload: any) => {
                if (payload?.src) logs.push(payload.src)
                return {}
            },
        }

        const pass = await runBasisPointBoundsAudit(mockLib)
        expect(pass).toBe(true)
        expect(logs.some((l) => l.includes('[LEVEL 1 & 2: PASS]'))).toBe(true)
    })

    it('passes Level 2 Banker rounding audit via mock stream', async () => {
        const logs: string[] = []
        const mockLib = {
            hunt: async (_act: string, payload: any) => {
                if (payload?.src) logs.push(payload.src)
                return {}
            },
        }

        const pass = await runBankersRoundingAudit(mockLib)
        expect(pass).toBe(true)
        expect(logs.some((l) => l.includes('[BANKER:PASS]'))).toBe(true)
    })

    it('passes Level 2 arbitrary integer division audit via mock stream', async () => {
        const logs: string[] = []
        const mockLib = {
            hunt: async (_act: string, payload: any) => {
                if (payload?.src) logs.push(payload.src)
                return {}
            },
        }

        const pass = await runArbitraryDivisionAudit(mockLib)
        expect(pass).toBe(true)
        expect(logs.some((l) => l.includes('[DIV_EVEN:PASS]'))).toBe(true)
    })

    it('passes Level 2 BigInt high-magnitude precision audit via mock stream', async () => {
        const logs: string[] = []
        const mockLib = {
            hunt: async (_act: string, payload: any) => {
                if (payload?.src) logs.push(payload.src)
                return {}
            },
        }

        const pass = await runBigIntPrecisionAudit(mockLib)
        expect(pass).toBe(true)
        expect(logs.some((l) => l.includes('[BIGINT:PASS]'))).toBe(true)
    })

    it('passes Level 3 exhaustive boundary gauntlet via mock stream', async () => {
        const logs: string[] = []
        const mockLib = {
            hunt: async (_act: string, payload: any) => {
                if (payload?.src) logs.push(payload.src)
                return {}
            },
        }

        const pass = await runExhaustiveGauntletAudit(mockLib)
        expect(pass).toBe(true)
        expect(logs.some((l) => l.includes('[GAUNTLET:PASS]'))).toBe(true)
    })

    it('executes Level 4 interactive choice [6. RUN ALL VERIFICATION LEVELS] via mock LIBRARY', async () => {
        const logs: string[] = []
        const mockLib = {
            hunt: async (action: string, payload: any) => {
                if (
                    action === '[Console action] Update Console' &&
                    payload?.src
                ) {
                    logs.push(payload.src)
                }
                if (action === '[Grid action] Update Grid') {
                    return { grdBit: { dat: {} } }
                }
                if (action === '[Open action] Open Choice') {
                    return { chcBit: { src: '6. RUN ALL VERIFICATION LEVELS' } }
                }
                return {}
            },
        }
        ;(globalThis as any).LIBRARY = mockLib

        try {
            const model = { idx: '98.menu' }
            await updateArithmeticMenu(model, {})
            expect(
                logs.some((l) =>
                    l.includes(
                        '>> [SUCCESS] ALL ARITHMETIC INVARIANTS CERTIFIED AT T_0 = $0.00',
                    ),
                ),
            ).toBe(true)
        } finally {
            delete (globalThis as any).LIBRARY
        }
    })

    it('returns clean receipt to root switchboard on ROOT MENU selection', async () => {
        const mockLib = {
            hunt: async (action: string) => {
                if (action === '[Grid action] Update Grid') {
                    return { grdBit: { dat: {} } }
                }
                if (action === '[Open action] Open Choice') {
                    return { chcBit: { src: 'ROOT MENU' } }
                }
                return {}
            },
        }
        ;(globalThis as any).LIBRARY = mockLib

        let rootSlvPayload: any = null
        try {
            const model = { idx: '98.menu' }
            await updateArithmeticMenu(model, {
                slv: (res: any) => {
                    rootSlvPayload = res
                },
            })
            expect(rootSlvPayload?.mnuBit?.idx).toBe('root-menu')
        } finally {
            delete (globalThis as any).LIBRARY
        }
    })

    it('binds submenu dispatch to canonical harness action types', () => {
        expect(UPDATE_GRID).toBe('[Grid action] Update Grid')
        expect(OPEN_CHOICE).toBe('[Open action] Open Choice')
        expect(UPDATE_CONSOLE).toBe('[Console action] Update Console')
        expect(CLOSE_TERMINAL).toBe('[Close action] Close Terminal')
    })

    it('routes OPEN ARITHMETIC MENU from the engine menu to the submenu', async () => {
        const choices: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choices.push(...bale.lst)
                return { chcBit: { src: 'OPEN ARITHMETIC MENU' } }
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const stateHunt = vi.fn(async () => ({}))

        try {
            await updateMenu(
                new MenuModel(),
                {} as any,
                { hunt: stateHunt } as any,
            )
        } finally {
            delete (global as any).LIBRARY
        }

        expect(choices).toContain('OPEN ARITHMETIC MENU')
        expect(stateHunt).toHaveBeenCalledWith(OPEN_ARITHMETIC_MENU, {})
    })

    it('streams per-choice telemetry for audits 1-5 via mock LIBRARY', async () => {
        const cases: Array<[string, string[]]> = [
            [
                '1. AUDIT BASIS POINT BOUNDS & FLOAT REJECTION',
                ['[BOUNDS:OK]', '[FLOAT:OK]', '[LEVEL 1 & 2: PASS]'],
            ],
            [
                '2. EXECUTE 4-CASE BANKER ROUNDING SUITE',
                [
                    '[BRANCH 1:OK]',
                    '[BRANCH 2:OK]',
                    '[BRANCH 3:OK]',
                    '[BRANCH 4:OK]',
                    '[BANKER:PASS]',
                ],
            ],
            [
                '3. EXECUTE ARBITRARY INTEGER DIVISION SUITE',
                [
                    '[DIV_ZERO:OK]',
                    '[POS_TIES:OK]',
                    '[NEG_TIES:OK]',
                    '[SYMMETRY:OK]',
                    '[DIV_EVEN:PASS]',
                ],
            ],
            [
                '4. EXECUTE 64-BIT BIGINT PRECISION SUITE',
                [
                    '[SAFE_INT:OK]',
                    '[TIMELINE:OK]',
                    '[INTERCEPT:OK]',
                    '[BIGINT:PASS]',
                ],
            ],
            [
                '5. RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET',
                [
                    '[ADVERSARIAL:OK]',
                    '[TIES:OK]',
                    '[CHAIN:OK]',
                    '[GAUNTLET:PASS]',
                ],
            ],
        ]
        for (const [choice, tokens] of cases) {
            const logs: string[] = []
            ;(globalThis as any).LIBRARY = {
                hunt: async (action: string, payload: any) => {
                    if (
                        action === '[Console action] Update Console' &&
                        payload?.src
                    ) {
                        logs.push(payload.src)
                    }
                    if (action === '[Grid action] Update Grid') {
                        return { grdBit: { dat: {} } }
                    }
                    if (action === '[Open action] Open Choice') {
                        return { chcBit: { src: choice } }
                    }
                    return {}
                },
            }
            try {
                await updateArithmeticMenu({ idx: '98.menu' }, {})
                for (const token of tokens) {
                    expect(logs.some((line) => line.includes(token))).toBe(true)
                }
            } finally {
                delete (globalThis as any).LIBRARY
            }
        }
    })
})

describe('98.menu.unit - Arithmetic Menu Globals Hygiene', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('leaves no LIBRARY global behind', () => {
        expect((global as any).LIBRARY).toBeUndefined()
        expect((globalThis as any).LIBRARY).toBeUndefined()
    })
})
