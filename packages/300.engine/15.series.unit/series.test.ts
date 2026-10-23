import { describe, it, expect, beforeEach } from 'vitest'
import { SeriesModel } from './series.model'
import {
    initSeries,
    selectSeries,
    resolveSeriesDbPath,
    sanitizeSeriesSlug,
    buildSeriesDbPath,
} from './series.buzzer'

describe('15.series.unit - Series Routing & Namespace Isolation', () => {
    let model: SeriesModel
    const mockState: any = { hunt: async () => ({}) }

    beforeEach(async () => {
        model = new SeriesModel()
        await initSeries(
            model,
            {
                idx: 'test-init',
                src: 'under-the-floorboards',
                dat: { isMemory: true },
            },
            mockState,
        )
    })

    it('sanitizes series slugs into clean kebab-case tokens', () => {
        expect(sanitizeSeriesSlug('Under The Floorboards')).toBe(
            'under-the-floorboards',
        )
        expect(sanitizeSeriesSlug('Wiregrass_Basin_01!!')).toBe(
            'wiregrass-basin-01',
        )
        expect(sanitizeSeriesSlug('')).toBe('default')
    })

    it('maps series slugs to local SQLite database filepaths', () => {
        const filePath = buildSeriesDbPath('wiregrass-basin')
        expect(filePath).toContain('wiregrass-basin.local.db')
        expect(buildSeriesDbPath('wiregrass-basin', true)).toBe(':memory:')
    })

    it('switches active series and updates model properties', async () => {
        let routingRes: any
        await selectSeries(
            model,
            {
                idx: 'test-select',
                src: 'wiregrass-basin',
                dat: { isMemory: true },
                slv: (r) => {
                    routingRes = r.routing
                },
            },
            mockState,
        )

        expect(model.activeSeriesSlug).toBe('wiregrass-basin')
        expect(routingRes.seriesSlug).toBe('wiregrass-basin')
        expect(routingRes.isMemory).toBe(true)
    })

    it('resolves explicit database path on demand', () => {
        let resolved: any
        resolveSeriesDbPath(
            model,
            {
                idx: 'test-res',
                src: 'goblin-tales',
                dat: { isMemory: false },
                slv: (r) => {
                    resolved = r.routing
                },
            },
            mockState,
        )

        expect(resolved.seriesSlug).toBe('goblin-tales')
        expect(resolved.dbPath).toContain('goblin-tales.local.db')
    })
})
