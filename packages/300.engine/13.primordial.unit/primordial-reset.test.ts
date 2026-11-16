import { describe, it, expect } from 'vitest'
import { PrimordialModel } from './primordial.model.js'
import { reducer } from './primordial.reduce.js'
import { RESET_PRIMORDIAL, ResetPrimordial } from './primordial.action.js'

describe('13.primordial.unit :: Reset Primordial Genesis Seeding State', () => {
    it('exposes RESET_PRIMORDIAL action contract', () => {
        expect(RESET_PRIMORDIAL).toBe('[Primordial action] Reset Primordial')
        expect(new ResetPrimordial()).toBeDefined()
        expect(new ResetPrimordial().type).toBe(RESET_PRIMORDIAL)
    })

    it('restores unseeded Void State through reducer', async () => {
        const model = new PrimordialModel()
        model.hRoot = 'f'.repeat(64)
        model.genesisSeeded = true
        model.activeSeriesSlug = 'gotham-trinity-crisis'

        let captured: any
        const next = (await reducer(
            model,
            new ResetPrimordial({
                idx: 'reset-primordial-test',
                slv: (res: any) => {
                    captured = res.primordialBit
                },
            }),
            undefined,
        )) as PrimordialModel

        expect(next.hRoot).toBe('0'.repeat(64))
        expect(next.genesisSeeded).toBe(false)
        expect(next.activeSeriesSlug).toBe('')
        expect(captured?.idx).toBe('reset-primordial-pass')
        expect(captured?.dat?.previousSeriesSlug).toBe('gotham-trinity-crisis')
        expect(captured?.dat?.wasSeeded).toBe(true)
    })

    it('resolves headless without ste or slv and stays idempotent', async () => {
        const model = new PrimordialModel()
        model.hRoot = 'a'.repeat(64)
        model.genesisSeeded = true
        model.activeSeriesSlug = 'gotham-trinity-crisis'

        const first = (await reducer(
            model,
            new ResetPrimordial({ idx: 'reset-primordial-headless' }),
            undefined,
        )) as PrimordialModel

        expect(first.hRoot).toBe('0'.repeat(64))
        expect(first.genesisSeeded).toBe(false)
        expect(first.activeSeriesSlug).toBe('')

        const second = (await reducer(
            first,
            new ResetPrimordial({ idx: 'reset-primordial-repeat' }),
            undefined,
        )) as PrimordialModel

        expect(second.hRoot).toBe('0'.repeat(64))
        expect(second.genesisSeeded).toBe(false)
        expect(second.activeSeriesSlug).toBe('')
    })
})
