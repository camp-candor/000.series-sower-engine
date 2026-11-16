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

export const resetSeriesAction = async (
    cpy: SeriesModel,
    bal?: SeriesBit,
    ste?: State,
): Promise<SeriesModel> => {
    const previousSeriesSlug = cpy.activeSeriesSlug || ''
    const clearedAllocationsCount = Object.keys(cpy.allocations || {}).length

    cpy.activeSeriesSlug = ''
    cpy.activeStorageTarget = ''
    cpy.allocations = {}
    cpy.seriesBits = {}

    if ((cpy as any).activeCorpus !== undefined) {
        ;(cpy as any).activeCorpus = undefined
    }
    if ((cpy as any).activeMetadata !== undefined) {
        ;(cpy as any).activeMetadata = undefined
    }
    if ((cpy as any).merkleRootHex !== undefined) {
        ;(cpy as any).merkleRootHex = '0'.repeat(64)
    }

    if (typeof globalThis !== 'undefined') {
        delete (globalThis as any).ACTIVE_SERIES_SLUG
    }

    const line =
        '>> [SERIES:RESET] Active series namespace unbound -> [NONE (UNBOUND)] [OK]'
    if (ste && typeof ste.hunt === 'function') {
        await ste
            .hunt('[Console action] Update Console', {
                idx: 'cns00',
                src: line,
            })
            .catch(() => {})
    }
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    if (lib && typeof lib.hunt === 'function') {
        await lib
            .hunt('[Console action] Update Console', {
                idx: 'cns00',
                src: line,
            })
            .catch(() => {})
    }

    if (bal?.slv) {
        bal.slv({
            seriesBit: {
                idx: 'reset-series-pass',
                val: 0,
                dat: {
                    previousSeriesSlug,
                    clearedAllocationsCount,
                    activeSeriesSlug: '',
                },
            },
        })
    }

    return cpy
}
