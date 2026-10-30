import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    profileBudget,
    formatBudgetPass,
    formatBudgetBreach,
    PROFILE_BUDGET_MS,
} from './buz/engine.buzz.js'
import { PROFILE_BUDGET } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

const RECEIPT_PATTERN =
    /^>> \[BUDGET_PASS\] Execution took \d+\.\d{4}ms \(Budget: <= 2\.0000ms\)$/

describe('profile budget', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('emits a BUDGET_PASS receipt with 4-decimal millisecond precision', () => {
        const slv = vi.fn()
        const result = profileBudget(
            new EngineModel(),
            { idx: 'profile', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('profile-budget-ok')
        expect(payload.fenBit.src).toMatch(RECEIPT_PATTERN)
    })

    it('holds the measured step under the 2.0000ms ceiling', () => {
        const slv = vi.fn()
        profileBudget(
            new EngineModel(),
            { idx: 'profile', slv } as any,
            {} as any,
        )
        const src = slv.mock.calls[0][0].fenBit.src as string
        const match = src.match(/Execution took (\d+\.\d{4})ms/)
        if (match == null || match[1] == null)
            throw new Error('BUDGET receipt missing measured duration')
        expect(Number(match[1])).toBeLessThanOrEqual(2.0)
        expect(PROFILE_BUDGET_MS).toBe(2.0)
    })

    it('formats the breach receipt with the fixed 2.0000ms cap', () => {
        expect(formatBudgetPass(0.412)).toBe(
            '>> [BUDGET_PASS] Execution took 0.4120ms (Budget: <= 2.0000ms)',
        )
        expect(formatBudgetBreach(3.5)).toBe(
            ':: [BUDGET_BREACH] Execution took 3.5000ms, strictly capped at 2.0000ms',
        )
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(profileBudget(model, { idx: 'profile' } as any, {} as any)).toBe(
            model,
        )
    })

    it('routes PROFILE_BUDGET through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            { type: PROFILE_BUDGET, bale: { idx: 'profile', slv } } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('profile-budget-ok')
    })

    it('streams the budget receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return { chcBit: { src: ' Profile Budget' } }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: formatBudgetPass(0.412) },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain(' Profile Budget')
        expect(engineHunt).toHaveBeenCalledWith(PROFILE_BUDGET, {})
        const budgetLine = consoles.find(
            (c) => c.idx === 'cns00' && RECEIPT_PATTERN.test(c.src),
        )
        expect(budgetLine).toBeTruthy()
    }, 10000)
})
