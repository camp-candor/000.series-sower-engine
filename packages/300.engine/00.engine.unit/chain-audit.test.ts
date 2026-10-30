import { describe, it, expect, vi, afterEach } from 'vitest'
import { chainAudit, CHAIN_RECEIPT_LINES } from './buz/engine.buzz.js'
import { CHAIN_AUDIT } from './engine.action.js'
import { reducer } from './engine.reduce.js'
import { EngineModel } from './engine.model.js'
import { MenuModel } from '../98.menu.unit/menu.model.js'
import { updateMenu } from '../98.menu.unit/buz/00.menu.buzz.js'

const EXPECTED_LINES = [
    '>> [CHAIN:AUDIT] Ingesting Left-Associative Chained Multiplier Core...',
    '>> [CHAIN:ORDER] Scale(Scale(Scale(V, M1), M2), M3) left-associativity verified.',
    '>> [CHAIN:BOUNDS] Intermediate product capped at <= 10^8 bp (MAX_SAFE_INTEGER protected).',
    '>> [CHAIN:NON_COMM] Non-commutative execution topology preserved across permutations.',
    '>> [CHAIN:EMPTY] Empty multiplier array rejected with [EMPTY_MULTIPLIERS].',
    '>> [KERNEL:SEALED] Chained multiplication sealed at T_0 = $0.00.',
]

describe('chain audit suite', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('emits all six exact chaining telemetry lines', () => {
        const slv = vi.fn()
        const result = chainAudit(
            new EngineModel(),
            { idx: 'chain', slv } as any,
            {} as any,
        )
        expect(result).toBeInstanceOf(EngineModel)
        expect(slv).toHaveBeenCalledOnce()
        const payload = slv.mock.calls[0][0]
        expect(payload.fenBit.idx).toBe('chain-audit-ok')
        expect([...CHAIN_RECEIPT_LINES]).toEqual(EXPECTED_LINES)
        expect(payload.fenBit.src).toBe(EXPECTED_LINES.join('\n'))
    })

    it('reports a clean dat contract on pass', () => {
        const slv = vi.fn()
        chainAudit(new EngineModel(), { idx: 'chain', slv } as any, {} as any)
        const dat = slv.mock.calls[0][0].fenBit.dat
        expect(dat.ok).toBe(true)
        expect(dat.detail).toBe('left-associative chaining verified end-to-end')
    })

    it('tolerates a missing solver without throwing', () => {
        const model = new EngineModel()
        expect(chainAudit(model, { idx: 'chain' } as any, {} as any)).toBe(
            model,
        )
    })

    it('routes CHAIN_AUDIT through the engine reducer', () => {
        const slv = vi.fn()
        reducer(
            new EngineModel(),
            {
                type: CHAIN_AUDIT,
                bale: { idx: 'chain', slv },
            } as any,
            {} as any,
        )
        expect(slv).toHaveBeenCalledOnce()
        expect(slv.mock.calls[0][0].fenBit.idx).toBe('chain-audit-ok')
    })

    it('streams the chain receipt to cns00 from the engine menu', async () => {
        const consoles: any[] = []
        let choiceList: string[] = []
        const libraryHunt = vi.fn(async (type: string, bale: any) => {
            if (type === '[Grid action] Update Grid')
                return { grdBit: { dat: { net: 1 } } }
            if (type === '[Open action] Open Choice') {
                choiceList = bale.lst
                return {
                    chcBit: { src: 'RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET' },
                }
            }
            if (type === '[Console action] Update Console') {
                consoles.push(bale)
                return {}
            }
            return {}
        })
        ;(global as any).LIBRARY = { hunt: libraryHunt }
        const engineHunt = vi.fn(async () => ({
            fenBit: { src: [...CHAIN_RECEIPT_LINES].join('\n') },
        }))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        expect(choiceList).toContain('RUN 100,000 BOUNDARY TIE-BREAK GAUNTLET')
        expect(choiceList).toContain(' Run 100,000 Boundary Tie-Break Gauntlet')
        expect(engineHunt).toHaveBeenCalledWith(CHAIN_AUDIT, {})
        for (const line of EXPECTED_LINES) {
            expect(
                consoles.some(
                    (c) =>
                        c.idx === 'cns00' && (c.src as string).includes(line),
                ),
            ).toBe(true)
        }
    }, 10000)
})
