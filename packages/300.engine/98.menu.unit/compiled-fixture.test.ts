import { describe, it, expect } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
    validateUniverseManifestShape,
    scanCompiledUniverses,
} from './buz/00.menu.buzz.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..', '..')

describe('98.menu.unit :: Shipped compiled realm fixture (Phase 4)', () => {
    it('ships a valid wiregrass-basin bible-state manifest', () => {
        const manifestPath = path.join(
            repoRoot,
            'compiled',
            'wiregrass-basin',
            'bible-state.json',
        )
        expect(fs.existsSync(manifestPath)).toBe(true)
        const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        const slug = parsed.seriesSlug || parsed.slug || parsed.series_slug
        expect(slug).toBe('wiregrass-basin')
        expect(validateUniverseManifestShape(parsed)).toBe(true)
    })

    it('discovers wiregrass-basin through the airlock scanner', () => {
        const found = scanCompiledUniverses(repoRoot).map((d) => d.seriesSlug)
        expect(found).toContain('wiregrass-basin')
    })
})
