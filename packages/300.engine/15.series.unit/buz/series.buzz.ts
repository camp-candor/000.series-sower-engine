import { SeriesModel } from '../series.model.js'
import type SeriesBit from '../fce/series.bit.js'
import type { SeriesStorageAllocation } from '../fce/series.interface.js'
import type State from '../../99.core/state.js'

const UPDATE_CONSOLE = '[Console action] Update Console'

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
    if (ste && typeof ste.hunt === 'function') {
        await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src }).catch(() => {})
    }
}

export function computeStoragePathForSlug(
    slug: string,
    useMemory = false,
): string {
    if (useMemory || slug === ':memory:') {
        return ':memory:'
    }
    const sanitized = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
    return `data/sqlite/${sanitized}.local.db`
}

export const initSeries = (
    cpy: SeriesModel,
    bal?: SeriesBit,
    _ste?: any,
): SeriesModel => {
    cpy.activeSeriesSlug = ''
    cpy.activeStorageTarget = ''
    cpy.allocations = {}

    if (bal?.slv) {
        bal.slv({
            srsBit: {
                idx: 'init-series-pass',
                val: 1,
                src: 'READY',
            },
        })
    }
    return cpy
}

export const updateSeries = (
    cpy: SeriesModel,
    bal?: SeriesBit,
    _ste?: any,
): SeriesModel => {
    if (bal?.slv) {
        bal.slv({
            srsBit: {
                idx: 'update-series-pass',
                val: 1,
                src: cpy.activeSeriesSlug,
            },
        })
    }
    return cpy
}

export const resolveSeriesStorage = async (
    cpy: SeriesModel,
    bal?: SeriesBit,
    ste?: any,
): Promise<SeriesModel> => {
    const seriesSlug = bal?.dat?.seriesSlug || bal?.src || 'default-realm'
    const useMemory = Boolean(
        bal?.dat?.useMemory || process.env.VITEST === 'true',
    )
    const explicitPath = bal?.dat?.targetPath

    const storageTarget =
        explicitPath || computeStoragePathForSlug(seriesSlug, useMemory)
    const nowMs = bal?.dat?.timestampMs || Date.now()

    const allocation: SeriesStorageAllocation = {
        seriesSlug,
        storageTarget,
        isMemoryOnly: storageTarget === ':memory:',
        resolvedAtMs: nowMs,
    }

    cpy.activeSeriesSlug = seriesSlug
    cpy.activeStorageTarget = storageTarget
    cpy.allocations[seriesSlug] = allocation

    await emitConsole(
        ste,
        `>> [VAULT:RESOLVE] Slug: [${seriesSlug}] Target: [${storageTarget}] (Memory: ${allocation.isMemoryOnly})`,
    )

    if (bal?.slv) {
        bal.slv({
            srsBit: {
                idx: 'resolve-series-storage-pass',
                val: 1,
                src: seriesSlug,
                dat: { allocation },
            },
        })
    }

    return cpy
}

export const getActiveSeries = (
    cpy: SeriesModel,
    bal?: SeriesBit,
    _ste?: any,
): SeriesModel => {
    if (bal?.slv) {
        bal.slv({
            srsBit: {
                idx: 'get-active-series-pass',
                val: 1,
                src: cpy.activeSeriesSlug,
                dat: {
                    activeSeriesSlug: cpy.activeSeriesSlug,
                    activeStorageTarget: cpy.activeStorageTarget,
                },
            },
        })
    }
    return cpy
}
