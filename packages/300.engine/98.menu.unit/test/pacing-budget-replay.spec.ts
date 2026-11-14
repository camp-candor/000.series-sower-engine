import { describe, expect, it, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
    auditThreeActPacingSimulation,
    runUnattendedAutoScriptSimulation,
    computeAutoScriptStackManifest,
} from '../buz/autoScriptRunner.buzz.js'

describe('98.menu.unit - 24H Anti-Clustering Dry-Spell Replay Audit', () => {
    afterEach(() => {
        delete (global as unknown as { LIBRARY?: unknown }).LIBRARY
    })

    it('certifies 96-tick 24h distribution with anti-clustering and replay identity', async () => {
        const seen: string[] = []
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async (_t: string, bale: { src?: string }) => {
                if (typeof bale?.src === 'string') seen.push(bale.src)
                return {}
            }),
        }
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pacing-24h-'))
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'audit-24h',
        )
        const receipt = await auditThreeActPacingSimulation(
            {
                seriesSlug: 'audit-24h',
                outputDir,
                repoRoot,
                startDate: '2026-10-31',
                startTime: '08:00',
                tickSeconds: 900,
                totalTicks: 96,
                masterSeed: 'auto_audit_24h_seed01',
            },
            undefined,
        )
        expect(receipt.totalTicks).toBe(96)
        expect(receipt.tickSeconds).toBe(900)
        expect(receipt.stackedCount).toBeGreaterThan(0)
        expect(receipt.noClusterViolation).toBe(true)
        expect(receipt.noDrySpellViolation).toBe(true)
        expect(receipt.escalatingClimaxCadence).toBe(true)
        expect(receipt.deterministic).toBe(true)
        expect(receipt.replayMismatches).toBe(0)
        expect(receipt.midnightRollover).toBe(true)
        expect(receipt.daypartsSeen).toContain('DAWN')
        expect(receipt.daypartsSeen).toContain('MORNING')
        expect(receipt.daypartsSeen).toContain('AFTERNOON')
        expect(receipt.daypartsSeen).toContain('DUSK')
        expect(receipt.daypartsSeen).toContain('NIGHT')
        expect(receipt.maxDrySpellObservedTicks).toBeLessThanOrEqual(8)
        expect(seen.some((s) => s.includes('[PACING:AUDIT24H]'))).toBe(true)
        for (const ch of seen.join('\n')) {
            expect(ch.charCodeAt(0)).toBeLessThanOrEqual(127)
        }
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('replays bit-identically after physical wipe of all scripts', async () => {
        ;(global as unknown as { LIBRARY: unknown }).LIBRARY = {
            hunt: vi.fn(async () => ({})),
        }
        const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pacing-wipe-'))
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'wipe-24h',
        )
        const params = {
            seriesSlug: 'wipe-24h',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '08:00',
            tickSeconds: 900,
            totalTicks: 96,
            masterSeed: 'auto_wipe_24h_seed01',
        }
        const first = await runUnattendedAutoScriptSimulation(params, undefined)
        const firstManifest = computeAutoScriptStackManifest(first.outputDir)
        fs.rmSync(first.outputDir, { recursive: true, force: true })
        expect(fs.existsSync(first.outputDir)).toBe(false)
        const second = await runUnattendedAutoScriptSimulation(
            params,
            undefined,
        )
        const secondManifest = computeAutoScriptStackManifest(second.outputDir)
        expect(secondManifest.stackDigestSha256).toBe(
            firstManifest.stackDigestSha256,
        )
        expect(secondManifest.files.map((f) => f.fileName)).toEqual(
            firstManifest.files.map((f) => f.fileName),
        )
        expect(secondManifest.files.length).toBeGreaterThan(0)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })
})
