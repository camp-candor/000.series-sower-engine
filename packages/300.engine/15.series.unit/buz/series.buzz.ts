import type { SeriesModel } from '../series.model'
import type SeriesBit from '../fce/series.bit'
import type State from '../../99.core/state'
import type { SeriesRoutingResolution } from '../fce/series.interface'
import path from 'path'
import fs from 'fs-extra'

export const emitConsole = async (
    ste: State | undefined,
    src: string,
): Promise<void> => {
    const lib = (global as any).LIBRARY || (globalThis as any).LIBRARY
    if (lib && typeof lib.hunt === 'function') {
        try {
            await lib.hunt('[Console action] Update Console', {
                idx: 'cns00',
                src,
            })
            return
        } catch {
            // Non-blocking degradation
        }
    }
}

/**
 * Normalizes and sanitizes a series slug to strict kebab-case ASCII.
 */
export const sanitizeSeriesSlug = (raw: string): string => {
    if (!raw || raw.trim().length === 0) return 'default'
    return (
        raw
            .toLowerCase()
            .trim()
            .replace(/[\s_]+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '') || 'default'
    )
}

/**
 * Deterministically maps a series slug to its target SQLite filepath or :memory:
 */
export const buildSeriesDbPath = (
    seriesSlug: string,
    isMemory = false,
): string => {
    if (isMemory || seriesSlug === ':memory:' || seriesSlug === 'memory') {
        return ':memory:'
    }
    const cleanSlug = sanitizeSeriesSlug(seriesSlug)
    return path.resolve(
        process.cwd(),
        'data',
        'sqlite',
        `${cleanSlug}.local.db`,
    )
}

export const initSeries = async (
    cpy: SeriesModel,
    bal: SeriesBit,
    ste: State,
): Promise<SeriesModel> => {
    const initialSlug = sanitizeSeriesSlug(
        bal?.src || cpy.activeSeriesSlug || 'default',
    )
    const isMemory = Boolean((bal?.dat as any)?.isMemory || bal?.val === 1)
    const dbPath = buildSeriesDbPath(initialSlug, isMemory)

    if (dbPath !== ':memory:') {
        fs.ensureDirSync(path.dirname(dbPath))
    }

    cpy.activeSeriesSlug = initialSlug
    cpy.activeDbPath = dbPath
    if (!cpy.availableSeries.includes(initialSlug)) {
        cpy.availableSeries.push(initialSlug)
    }

    if (ste?.value?.series) {
        ste.value.series.activeSeriesSlug = cpy.activeSeriesSlug
        ste.value.series.activeDbPath = cpy.activeDbPath
        ste.value.series.availableSeries = cpy.availableSeries
    }

    await emitConsole(
        ste,
        `>> [SERIES:INIT] [OK] Active series bound: '${initialSlug}' -> ${dbPath}`,
    )

    const routing: SeriesRoutingResolution = {
        seriesSlug: initialSlug,
        dbPath,
        isMemory: dbPath === ':memory:',
        resolvedAt: new Date().toISOString(),
    }

    if (bal?.slv) {
        bal.slv({
            srsBit: { idx: 'init-series', src: initialSlug },
            routing,
        })
    }
    return cpy
}

export const updateSeries = async (
    cpy: SeriesModel,
    bal: SeriesBit,
    _ste: State,
): Promise<SeriesModel> => {
    if (bal?.slv) {
        bal.slv({
            srsBit: { idx: 'update-series', src: cpy.activeSeriesSlug },
            routing: {
                seriesSlug: cpy.activeSeriesSlug,
                dbPath: cpy.activeDbPath,
                isMemory: cpy.activeDbPath === ':memory:',
                resolvedAt: new Date().toISOString(),
            },
        })
    }
    return cpy
}

export const selectSeries = async (
    cpy: SeriesModel,
    bal: SeriesBit,
    ste: State,
): Promise<SeriesModel> => {
    const rawSlug = bal?.src || (bal?.dat as any)?.slug || 'default'
    const cleanSlug = sanitizeSeriesSlug(rawSlug)
    const isMemory = Boolean((bal?.dat as any)?.isMemory)
    const dbPath = buildSeriesDbPath(cleanSlug, isMemory)

    if (dbPath !== ':memory:') {
        fs.ensureDirSync(path.dirname(dbPath))
    }

    cpy.activeSeriesSlug = cleanSlug
    cpy.activeDbPath = dbPath
    if (!cpy.availableSeries.includes(cleanSlug)) {
        cpy.availableSeries.push(cleanSlug)
    }

    if (ste?.value?.series) {
        ste.value.series.activeSeriesSlug = cpy.activeSeriesSlug
        ste.value.series.activeDbPath = cpy.activeDbPath
        ste.value.series.availableSeries = cpy.availableSeries
    }

    await emitConsole(
        ste,
        `>> [SERIES:SELECT] [OK] Switched active series to '${cleanSlug}'`,
    )

    const routing: SeriesRoutingResolution = {
        seriesSlug: cleanSlug,
        dbPath,
        isMemory: dbPath === ':memory:',
        resolvedAt: new Date().toISOString(),
    }

    if (bal?.slv) {
        bal.slv({
            srsBit: { idx: 'select-series', src: cleanSlug },
            routing,
        })
    }
    return cpy
}

export const resolveSeriesDbPath = (
    cpy: SeriesModel,
    bal: SeriesBit,
    _ste: State,
): SeriesModel => {
    const targetSlug = bal?.src
        ? sanitizeSeriesSlug(bal.src)
        : cpy.activeSeriesSlug
    const isMemory = Boolean((bal?.dat as any)?.isMemory)
    const dbPath = buildSeriesDbPath(targetSlug, isMemory)

    const routing: SeriesRoutingResolution = {
        seriesSlug: targetSlug,
        dbPath,
        isMemory: dbPath === ':memory:',
        resolvedAt: new Date().toISOString(),
    }

    if (bal?.slv) {
        bal.slv({
            srsBit: { idx: 'resolve-series-db-path', src: dbPath },
            routing,
        })
    }
    return cpy
}

export const listAvailableSeries = async (
    cpy: SeriesModel,
    bal: SeriesBit,
    ste: State,
): Promise<SeriesModel> => {
    const sqliteDir = path.resolve(process.cwd(), 'data', 'sqlite')
    const discovered = new Set<string>(cpy.availableSeries)

    if (await fs.pathExists(sqliteDir)) {
        try {
            const files = await fs.readdir(sqliteDir)
            for (const f of files) {
                if (f.endsWith('.local.db')) {
                    const slug = f.replace(/\.local\.db$/, '')
                    discovered.add(slug)
                }
            }
        } catch {
            // Non-blocking disk read degradation
        }
    }

    cpy.availableSeries = Array.from(discovered).sort()

    if (ste?.value?.series) {
        ste.value.series.availableSeries = cpy.availableSeries
    }

    if (bal?.slv) {
        bal.slv({
            srsBit: { idx: 'list-available-series' },
            lst: cpy.availableSeries,
        })
    }
    return cpy
}
