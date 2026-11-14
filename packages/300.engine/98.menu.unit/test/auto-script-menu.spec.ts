import { describe, expect, it, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MenuModel } from '../../98.menu.unit/menu.model.js'
import {
    AUTO_SCRIPT_MENU_LABEL,
    openAutoScriptCockpitMenu,
    updateMenu,
    MENU_CHOICES,
} from '../../98.menu.unit/buz/00.menu.buzz.js'
import { verifySixFountainCategories } from '../../21.compile.unit/buz/eventFountainSynth.buzz.js'
import { RUN_AUTO_SCRIPT_SIMULATION } from '../../98.menu.unit/menu.action.js'

describe('Auto-Screenplay Cockpit Menu', () => {
    afterEach(() => {
        delete (global as unknown as { LIBRARY?: unknown }).LIBRARY
    })

    it('registers [22] label and action constant', () => {
        expect(AUTO_SCRIPT_MENU_LABEL).toBe(
            '[22] RUN UNATTENDED AUTO-SCREENPLAY SIMULATION',
        )
        expect(RUN_AUTO_SCRIPT_SIMULATION).toBe(
            '[Menu action] Run Auto-Script Simulation',
        )
        expect(MENU_CHOICES).toContain(
            '[22] RUN UNATTENDED AUTO-SCREENPLAY SIMULATION',
        )
    })

    it('routes headless launch with live cns00 timecode and stacked banners', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (type: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-menu-'))
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'menu-slug',
        )
        const model = new MenuModel()
        let resolved: unknown = null
        await openAutoScriptCockpitMenu(
            model,
            {
                idx: 'auto-menu',
                dat: {
                    action: 'launch',
                    seriesSlug: 'menu-slug',
                    outputDir,
                    repoRoot,
                    startDate: '2026-10-31',
                    startTime: '21:00:00',
                    totalTicks: 24,
                    masterSeed: 'auto_menu_slug_seed01',
                },
                slv: (r: unknown) => {
                    resolved = r
                },
            } as unknown as never,
            undefined,
        )
        expect(resolved).toBeDefined()
        expect(fs.existsSync(path.join(outputDir, 'index.json'))).toBe(true)
        expect(seen.some((s) => s.includes('[AUTO:TIMECODE]'))).toBe(true)
        expect(seen.some((s) => s.includes('[AUTO:STACKED]'))).toBe(true)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('rejects bad date input fail-closed with AUTO ERR', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_t: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const model = new MenuModel()
        await openAutoScriptCockpitMenu(
            model,
            {
                idx: 'auto-menu',
                dat: {
                    action: 'launch',
                    seriesSlug: 'bad-slug',
                    startDate: '2025-02-29',
                    startTime: '25:99',
                },
                slv: () => {},
            } as unknown as never,
            undefined,
        )
        expect(seen.some((s) => s.includes('[AUTO:ERR]'))).toBe(true)
    })

    it('triggers conductor batch export headlessly', async () => {
        const repoRoot = fs.mkdtempSync(
            path.join(os.tmpdir(), 'auto-menu-export-'),
        )
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'export-menu-slug',
        )
        const conductorDir = path.join(
            repoRoot,
            'conductor',
            'export-menu-slug',
            'auto-script',
        )
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const model = new MenuModel()
        await openAutoScriptCockpitMenu(
            model,
            {
                idx: 'auto-menu',
                dat: {
                    action: 'launch',
                    seriesSlug: 'export-menu-slug',
                    outputDir,
                    repoRoot,
                    startDate: '2026-10-31',
                    startTime: '21:00:00',
                    totalTicks: 24,
                    masterSeed: 'auto_export_menu_seed01',
                },
                slv: () => {},
            } as unknown as never,
            undefined,
        )
        await openAutoScriptCockpitMenu(
            new MenuModel(),
            {
                idx: 'auto-menu',
                dat: {
                    action: 'export',
                    seriesSlug: 'export-menu-slug',
                    outputDir,
                    repoRoot,
                    conductorIngressDir: conductorDir,
                },
                slv: () => {},
            } as unknown as never,
            undefined,
        )
        expect(fs.existsSync(conductorDir)).toBe(true)
        expect(fs.readdirSync(conductorDir).length).toBeGreaterThan(0)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('binds every CHOICE OPEN and INPUT OPEN with net mesh anchoring', async () => {
        const source = fs.readFileSync(
            path.join(
                process.cwd(),
                'packages',
                '300.engine',
                '98.menu.unit',
                'buz',
                '00.menu.buzz.ts',
            ),
            'utf8',
        )
        expect(source.includes('AUTO_SCRIPT_MENU_LABEL')).toBe(true)
        expect(source.includes('OPEN_INPUT')).toBe(true)
        expect(source.includes('net:')).toBe(true)
        expect(source.includes('xSpan: 4')).toBe(true)
        expect(source.includes('xSpan: 8')).toBe(true)
        expect(source.includes('ySpan: 8')).toBe(true)
        expect(source.includes('ySpan: 12')).toBe(true)
    })

    it('dispatches updateMenu with [22] and uppercase action LAUNCH verifying all 6 categories', async () => {
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-update-'))
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'wiregrass-basin',
        )
        let resolved: unknown = null
        await updateMenu(
            new MenuModel(),
            {
                idx: 'menu-22',
                src: '[22] RUN UNATTENDED AUTO-SCREENPLAY SIMULATION',
                dat: {
                    action: 'LAUNCH',
                    seriesSlug: 'wiregrass-basin',
                    startDate: '2026-10-31',
                    startTime: '21:00',
                    totalTicks: 15,
                    outputDir,
                    repoRoot,
                },
                slv: (r: unknown) => {
                    resolved = r
                },
            } as unknown as never,
            undefined,
        )
        expect(resolved).toBeDefined()
        expect(fs.existsSync(path.join(outputDir, 'index.json'))).toBe(true)
        const files = fs.readdirSync(outputDir)
        const fountains = files.filter((f) => f.endsWith('.fountain'))
        const asts = files.filter((f) => f.endsWith('.ast.json'))
        expect(fountains.length).toBeGreaterThan(0)
        expect(asts.length).toBe(fountains.length)
        for (const f of fountains) {
            const text = fs.readFileSync(path.join(outputDir, f), 'utf8')
            expect(text).toContain('Date: 2026-10-31')
            expect(text).toContain('Start-Time:')
            expect(verifySixFountainCategories(text).allValid).toBe(true)
        }
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })
})
