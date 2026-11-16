import { describe, it, expect } from 'vitest'
import { SeriesModel } from './series.model.js'
import { reducer } from './series.reduce.js'
import { RESET_SERIES, ResetSeries } from './series.action.js'

describe('15.series.unit :: Reset Active Series Namespace Allocations', () => {
    it('exposes RESET_SERIES action contract', () => {
        expect(RESET_SERIES).toBe('[Series action] Reset Series')
        expect(new ResetSeries()).toBeDefined()
        expect(new ResetSeries().type).toBe(RESET_SERIES)
    })

    it('unbinds active series namespace through reducer', async () => {
        const model = new SeriesModel()
        model.activeSeriesSlug = 'gotham-trinity-crisis'
        model.activeStorageTarget = 'data/sqlite/gotham.local.db'
        model.allocations = {
            'gotham-trinity-crisis': {
                seriesSlug: 'gotham-trinity-crisis',
                storageTarget: 'data/sqlite/gotham.local.db',
                isMemoryOnly: false,
                resolvedAtMs: 1700000000000,
            },
        } as any
        model.seriesBits = { 'gotham-trinity-crisis': { idx: 'seed' } as any }
        ;(globalThis as any).ACTIVE_SERIES_SLUG = 'gotham-trinity-crisis'

        let captured: any
        const next = (await reducer(
            model,
            new ResetSeries({
                idx: 'reset-series-test',
                slv: (res: any) => {
                    captured = res.seriesBit
                },
            }),
            undefined as any,
        )) as SeriesModel

        expect(next.activeSeriesSlug).toBe('')
        expect(next.activeStorageTarget).toBe('')
        expect(next.allocations).toEqual({})
        expect(next.seriesBits).toEqual({})
        expect((globalThis as any).ACTIVE_SERIES_SLUG).toBe(undefined)
        expect(captured?.idx).toBe('reset-series-pass')
        expect(captured?.dat?.previousSeriesSlug).toBe('gotham-trinity-crisis')
        expect(captured?.dat?.clearedAllocationsCount).toBe(1)
    })

    it('clears optional corpus fields and tolerates missing global key', async () => {
        const model = new SeriesModel()
        model.activeSeriesSlug = 'gotham-trinity-crisis'
        ;(model as any).activeCorpus = { frozen: true }
        ;(model as any).activeMetadata = { slug: 'gotham-trinity-crisis' }
        ;(model as any).merkleRootHex = 'b'.repeat(64)
        delete (globalThis as any).ACTIVE_SERIES_SLUG

        const next = (await reducer(
            model,
            new ResetSeries({ idx: 'reset-series-guarded' }),
            undefined as any,
        )) as SeriesModel

        expect(next.activeSeriesSlug).toBe('')
        expect((next as any).activeCorpus).toBe(undefined)
        expect((next as any).activeMetadata).toBe(undefined)
        expect((next as any).merkleRootHex).toBe('0'.repeat(64))
        expect((globalThis as any).ACTIVE_SERIES_SLUG).toBe(undefined)
    })
})
