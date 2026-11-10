import { describe, it, expect, beforeEach } from 'vitest'
import {
    computeStoragePathForSlug,
    resolveSeriesStorage,
} from './buz/series.buzz.js'
import { SeriesModel } from './series.model.js'

describe('15.series.unit :: Storage Path Allocation (Phase 4)', () => {
    let model: SeriesModel

    beforeEach(() => {
        model = new SeriesModel()
    })

    it('computes sanitized sqlite path from series slug', () => {
        expect(computeStoragePathForSlug('wiregrass-basin')).toBe(
            'data/sqlite/wiregrass-basin.local.db',
        )
        expect(computeStoragePathForSlug('BLESSSED_AND_BOUNDED')).toBe(
            'data/sqlite/blesssed_and_bounded.local.db',
        )
        expect(computeStoragePathForSlug('invalid!slug@test')).toBe(
            'data/sqlite/invalid-slug-test.local.db',
        )
    })

    it('routes to :memory: when useMemory flag is true', () => {
        expect(computeStoragePathForSlug('wiregrass-basin', true)).toBe(
            ':memory:',
        )
        expect(computeStoragePathForSlug(':memory:', false)).toBe(':memory:')
    })

    it('resolves series storage through action buzzer and records allocation', () => {
        const bit: any = {
            src: 'wiregrass-basin',
            dat: {
                seriesSlug: 'wiregrass-basin',
                targetPath: 'data/sqlite/wiregrass-basin.local.db',
                useMemory: false,
            },
        }

        const updated = resolveSeriesStorage(model, bit)
        expect(updated.activeSeriesSlug).toBe('wiregrass-basin')
        expect(updated.activeStorageTarget).toBe(
            'data/sqlite/wiregrass-basin.local.db',
        )
        expect(updated.allocations['wiregrass-basin']).toBeDefined()
        expect(updated.allocations['wiregrass-basin'].isMemoryOnly).toBe(false)
    })
})
