import { describe, expect, it, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { MenuModel } from '../menu.model.js'
import { openAutoScriptCockpitMenu } from '../buz/00.menu.buzz.js'
import { CONFIGURE_ENGINE_PACING_BUDGET } from '../menu.action.js'

describe('98.menu.unit - Pacing Budget Cockpit Controls', () => {
    afterEach(() => {
        delete (global as unknown as { LIBRARY?: unknown }).LIBRARY
    })

    it('registers configure pacing budget action constant', () => {
        expect(CONFIGURE_ENGINE_PACING_BUDGET).toBe(
            '[Menu action] Configure Engine Pacing Budget',
        )
    })

    it('applies valid pacing overrides headlessly with override telemetry', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_t: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        let resolved: unknown = null
        await openAutoScriptCockpitMenu(
            new MenuModel(),
            {
                idx: 'pacing-config',
                dat: {
                    action: 'configure',
                    minTicksBetweenScenes: 2,
                    maxDrySpellTicks: 6,
                    actWindowMode: 'SOLAR_24H_CYCLE',
                    actIMultiplierBps: 8000,
                    actIIMultiplierBps: 10000,
                    actIIIMultiplierBps: 14500,
                },
                slv: (r: unknown) => {
                    resolved = r
                },
            } as unknown as never,
            undefined,
        )
        expect(resolved).toBeDefined()
        expect(seen.some((s) => s.includes('[PACING:OVERRIDE]'))).toBe(true)
    })

    it('rejects invalid numeric overrides fail-closed with pacing err', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_t: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        for (const bad of [
            { minTicksBetweenScenes: -2 },
            { maxDrySpellTicks: 0 },
            { minTicksBetweenScenes: 2.5 },
            { actIMultiplierBps: -10 },
        ]) {
            seen.length = 0
            await openAutoScriptCockpitMenu(
                new MenuModel(),
                {
                    idx: 'pacing-bad',
                    dat: { action: 'configure', ...bad },
                    slv: () => {},
                } as unknown as never,
                undefined,
            )
            expect(seen.some((s) => s.includes('[PACING:ERR]'))).toBe(true)
        }
    })

    it('dispatches 24h pacing audit headlessly with ascii bar telemetry', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const libHunt = (global as unknown as { LIBRARY: { hunt: unknown } })
            .LIBRARY.hunt as ReturnType<typeof vi.fn>
        const collected: string[] = []
        ;(
            libHunt as unknown as { mockImplementation: Function }
        ).mockImplementation(async (_t: string, bale: { src?: string }) => {
            if (typeof bale?.src === 'string') collected.push(bale.src)
            return {}
        })
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pacing-menu-'))
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'menu-audit',
        )
        let resolved: unknown = null
        await openAutoScriptCockpitMenu(
            new MenuModel(),
            {
                idx: 'pacing-audit',
                dat: {
                    action: 'pacing-audit',
                    seriesSlug: 'menu-audit',
                    outputDir,
                    repoRoot,
                    startDate: '2026-10-31',
                    startTime: '08:00',
                    totalTicks: 96,
                    tickSeconds: 900,
                    masterSeed: 'auto_menu_audit_seed01',
                },
                slv: (r: unknown) => {
                    resolved = r
                },
            } as unknown as never,
            undefined,
        )
        expect(resolved).toBeDefined()
        expect(collected.some((s) => s.includes('[PACING:AUDIT24H]'))).toBe(
            true,
        )
        expect(collected.some((s) => s.startsWith('ACT_I'))).toBe(true)
        expect(collected.some((s) => s.startsWith('ACT_II'))).toBe(true)
        expect(collected.some((s) => s.startsWith('ACT_III'))).toBe(true)
        for (const ch of collected.join('\n')) {
            expect(ch.charCodeAt(0)).toBeLessThanOrEqual(127)
        }
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('binds net mesh on every choice and input open with zero console calls', () => {
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
        expect(source).toContain('[5] CONFIGURE THREE-ACT PACING COOLDOWN')
        expect(source).toContain('[6] RUN 24H PACING DISTRIBUTION AUDIT')
        const choiceOpens = source.split('OPEN_CHOICE').length - 1
        const inputOpens = source.split('OPEN_INPUT').length - 1
        expect(choiceOpens).toBeGreaterThan(0)
        expect(inputOpens).toBeGreaterThan(0)
        const netBindings = source.split('net:').length - 1
        expect(netBindings).toBeGreaterThanOrEqual(choiceOpens + inputOpens)
        expect(source.includes('console.log')).toBe(false)
        expect(source.includes('console.error')).toBe(false)
    })

    it('persists configured pacing overrides onto MenuModel for subsequent runs', async () => {
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const model = new MenuModel()
        const updated = await openAutoScriptCockpitMenu(
            model,
            {
                idx: 'pacing-persist',
                dat: {
                    action: 'configure',
                    minTicksBetweenScenes: 4,
                    maxDrySpellTicks: 7,
                    actWindowMode: 'SOLAR_24H_CYCLE',
                },
                slv: () => {},
            } as unknown as never,
            undefined,
        )
        expect(updated.pacingOverrides?.minTicksBetweenScenes).toBe(4)
        expect(updated.pacingOverrides?.maxDrySpellTicks).toBe(7)
        expect(updated.pacingOverrides?.actWindowMode).toBe('SOLAR_24H_CYCLE')
    })
})
