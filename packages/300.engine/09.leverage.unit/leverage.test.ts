import { describe, it, expect, beforeEach } from 'vitest'
import { LeverageModel } from './leverage.model'
import * as Buzz from './buz/leverage.buzz'
import { assertBasisPoints, makeRelationId } from './buz/leverage.buzz'

describe('09.leverage.unit (Directional Social Debt)', () => {
    let model: LeverageModel
    let mockState: any

    beforeEach(() => {
        model = new LeverageModel()
        mockState = {
            hunt: async () => ({}),
        }
    })

    it('rejects self-referential leverage with [ANTI_REFLEXIVITY_BREACH]', async () => {
        let result: any = null
        await Buzz.mutateStringLeverage(
            model,
            {
                idx: 'test',
                dat: {
                    holder_id: 'char_bog',
                    debtor_id: 'char_bog',
                    strings_count: 2,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('mutate-string-leverage-error')
        expect(result.levBit.src).toContain('[ANTI_REFLEXIVITY_BREACH]')
        expect(result.levBit.val).toBe(-1)
    })

    it('mutates directional strings and enforces basis point integers', async () => {
        let result: any = null
        await Buzz.mutateStringLeverage(
            model,
            {
                idx: 'test',
                dat: {
                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    strings_count: 3,
                    weight_bps: 4500,
                    timestamp_ms: 1000,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('mutate-string-leverage')
        expect(result.levBit.val).toBe(3)
        expect(model.records['char_bog->char_wart'].strings_count).toBe(3)
        expect(model.records['char_bog->char_wart'].weight_bps).toBe(4500)
    })

    it('rejects floating-point weight with [FLOAT_PROHIBITED]', async () => {
        let result: any = null
        await Buzz.mutateStringLeverage(
            model,
            {
                idx: 'test',
                dat: {
                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    weight_bps: 12.34,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('mutate-string-leverage-error')
        expect(result.levBit.src).toContain('[FLOAT_PROHIBITED]')
    })

    it('prevents spending more strings than held with [INSUFFICIENT_STRINGS_BREACH]', async () => {
        // Seed with 1 string
        model.records['char_bog->char_wart'] = {
            relation_id: 'char_bog->char_wart',
            holder_id: 'char_bog',
            debtor_id: 'char_wart',
            weight_bps: 2000,
            strings_count: 1,
            updated_at_ms: 100,
        }

        let result: any = null
        await Buzz.spendStringLeverage(
            model,
            {
                idx: 'test',
                dat: {
                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    spend_count: 2,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('spend-string-leverage-error')
        expect(result.levBit.src).toContain('[INSUFFICIENT_STRINGS_BREACH]')
        expect(model.records['char_bog->char_wart'].strings_count).toBe(1)
    })

    it('successfully spends valid strings count', async () => {
        model.records['char_bog->char_wart'] = {
            relation_id: 'char_bog->char_wart',
            holder_id: 'char_bog',
            debtor_id: 'char_wart',
            weight_bps: 2000,
            strings_count: 3,
            updated_at_ms: 100,
        }

        let result: any = null
        await Buzz.spendStringLeverage(
            model,
            {
                idx: 'test',
                dat: {
                    holder_id: 'char_bog',
                    debtor_id: 'char_wart',
                    spend_count: 2,
                },
                slv: (r) => {
                    result = r
                },
            },
            mockState,
        )

        expect(result.levBit.idx).toBe('spend-string-leverage')
        expect(result.levBit.val).toBe(1)
        expect(model.records['char_bog->char_wart'].strings_count).toBe(1)
    })

    it('exposes assertBasisPoints rejecting floats and out-of-bounds weights', () => {
        expect(() => assertBasisPoints(12.34, 'weight_bps')).toThrow(
            /\[FLOAT_PROHIBITED\]/,
        )
        expect(() => assertBasisPoints(-1, 'weight_bps')).toThrow(
            /\[OUT_OF_BOUNDS\]/,
        )
        expect(() => assertBasisPoints(10001, 'weight_bps')).toThrow(
            /\[OUT_OF_BOUNDS\]/,
        )
        expect(assertBasisPoints(0, 'weight_bps')).toBe(0)
        expect(assertBasisPoints(10000, 'weight_bps')).toBe(10000)
    })

    it('exposes makeRelationId formatting canonical asymmetric dyads', () => {
        expect(makeRelationId('char_bog', 'char_wart')).toBe(
            'char_bog->char_wart',
        )
        expect(makeRelationId('  char_bog  ', 'char_wart ')).toBe(
            'char_bog->char_wart',
        )
    })
})
