import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LeverageModel } from './leverage.model.js'
import * as Buzz from './buz/leverage.buzz.js'
import { MUTATE_LEVERAGE_STRINGS } from './leverage.action.js'
import { reducer } from './leverage.reduce.js'

describe('09.leverage.unit - Anti-Reflexive Directional Social Debt Battery', () => {
    let model: LeverageModel
    let mockState: any
    let dbOperations: any[]
    let eventAppends: any[]

    beforeEach(() => {
        model = new LeverageModel()
        dbOperations = []
        eventAppends = []
        mockState = {
            hunt: vi.fn(async (actionType: string, payload: any) => {
                if (actionType.includes('Exec Batch Database')) {
                    dbOperations.push(...payload.dat.operations)
                    return { databaseBit: { val: 1 } }
                }
                if (actionType.includes('Append Event')) {
                    eventAppends.push(payload.dat.appendParams)
                    return { eventBit: { val: 1 } }
                }
                if (actionType.includes('Query Database')) {
                    return { databaseBit: { val: 0 } }
                }
                return {}
            }),
        }
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
        delete (globalThis as any).LIBRARY
    })

    it('rejects self-referential leverage with [ANTI_REFLEXIVITY_BREACH] at T_0 = $0.00', async () => {
        let result: any = null
        await Buzz.mutateStringLeverage(
            model,
            {
                idx: 'test-self',
                dat: {
                    // @ts-ignore

                    holder_id: 'char_bog',
                    debtor_id: 'char_bog',
                    strings_count: 2,
                },
                slv: (r: any) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('mutate-string-leverage-error')
        expect(result.levBit.src).toContain('[ANTI_REFLEXIVITY_BREACH]')
        expect(result.levBit.val).toBe(-1)
        expect(model.records.size).toBe(0)
        expect(dbOperations).toHaveLength(0)
    })

    it('mutates directional strings and enforces basis point integers', async () => {
        let result: any = null
        await Buzz.mutateStringLeverage(
            model,
            {
                idx: 'test-mutate',
                dat: {
                    // @ts-ignore

                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    strings_count: 3,
                    weight_bps: 4500,
                    timestamp_ms: 1000,
                },
                slv: (r: any) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('mutate-string-leverage')
        expect(result.levBit.val).toBe(3)
        expect(model.records.get('char_bog->char_wart')?.strings_count).toBe(3)
        expect(model.records.get('char_bog->char_wart')?.weight_bps).toBe(4500)
        expect(dbOperations).toHaveLength(1)
        expect(dbOperations[0].table).toBe('strings_ledger')
        expect(eventAppends).toHaveLength(1)
        expect(eventAppends[0].eventType).toBe('LEVERAGE_STRING_MUTATED')
    })

    it('rejects floating-point weight with [FLOAT_PROHIBITED]', async () => {
        let result: any = null
        await Buzz.mutateStringLeverage(
            model,
            {
                idx: 'test-float',
                dat: {
                    // @ts-ignore

                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    weight_bps: 12.34,
                },
                slv: (r: any) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('mutate-string-leverage-error')
        expect(result.levBit.src).toContain('[FLOAT_PROHIBITED]')
        expect(result.levBit.val).toBe(-1)
    })

    it('prevents spending more strings than held with [INSUFFICIENT_STRINGS_BREACH]', async () => {
        // Seed with 1 string
        model.records.set('char_bog->char_wart', {
            relation_id: 'char_bog->char_wart',
            holder_id: 'char_bog',
            debtor_id: 'char_wart',
            weight_bps: 2000,
            strings_count: 1,
            updated_at_ms: 100,
        })

        let result: any = null
        await Buzz.spendStringLeverage(
            model,
            {
                idx: 'test-overdraft',
                dat: {
                    // @ts-ignore

                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    spend_count: 2,
                },
                slv: (r: any) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('spend-string-leverage-error')
        expect(result.levBit.src).toContain('[INSUFFICIENT_STRINGS_BREACH]')
        expect(result.levBit.val).toBe(-1)
        expect(model.records.get('char_bog->char_wart')?.strings_count).toBe(1)
    })

    it('successfully spends valid strings count and decrements balance', async () => {
        model.records.set('char_bog->char_wart', {
            relation_id: 'char_bog->char_wart',
            holder_id: 'char_bog',
            debtor_id: 'char_wart',
            weight_bps: 2000,
            strings_count: 3,
            updated_at_ms: 100,
        })

        let result: any = null
        await Buzz.spendStringLeverage(
            model,
            {
                idx: 'test-spend',
                dat: {
                    // @ts-ignore

                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    spend_count: 2,
                },
                slv: (r: any) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('spend-string-leverage')
        expect(result.levBit.val).toBe(1)
        expect(model.records.get('char_bog->char_wart')?.strings_count).toBe(1)
        expect(result.spendReceipt.success).toBe(true)
        expect(result.spendReceipt.remaining_strings_count).toBe(1)
    })

    it('audits social debt graph solvency and flags self-referential breaches', async () => {
        model.records.set('char_wart->char_wart', {
            relation_id: 'char_wart->char_wart',
            holder_id: 'char_wart',
            debtor_id: 'char_wart',
            weight_bps: 1000,
            strings_count: 1,
            updated_at_ms: 100,
        })

        const slv = vi.fn()
        await Buzz.auditLeverageSolvencyAction(
            model,
            { idx: 'audit', slv },
            mockState,
        )

        expect(slv).toHaveBeenCalled()
        const report = slv.mock.calls[0][0].auditReport
        expect(report.valid).toBe(false)
        expect(report.selfReferentialBreaches).toContain('char_wart->char_wart')
    })

    it('routes MUTATE_LEVERAGE_STRINGS cleanly through pure reducer using clone-deep', async () => {
        const slv = vi.fn()
        const result = (await reducer(
            model,
            {
                type: MUTATE_LEVERAGE_STRINGS,
                bale: {
                    idx: 'reducer-mutate',
                    dat: {
                        // @ts-ignore

                        holder_id: 'char_bog',
                        debtor_id: 'char_wart',
                        strings_count: 2,
                    },
                    slv,
                } as any,
            },
            mockState,
        )) as LeverageModel

        expect(result).toBeInstanceOf(LeverageModel)
        expect(slv).toHaveBeenCalled()
    })
})
