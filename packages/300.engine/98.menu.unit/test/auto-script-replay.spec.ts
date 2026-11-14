import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
    runUnattendedAutoScriptSimulation,
    verifyAutoScriptReplayDeterminism,
    exportAutoScriptBatchToConductor,
} from '../../98.menu.unit/buz/autoScriptRunner.buzz.js'

function makeTempRoot(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'auto-replay-'))
}

describe('Auto-Script Replay Wipe-Reset Audit Batch Export', () => {
    it('proves delete-all plus restart bit-identity across stacked screenplays', async () => {
        const repoRoot = makeTempRoot()
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'replay-slug',
        )
        const base = {
            seriesSlug: 'replay-slug',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '21:00:00',
            tickSeconds: 3600,
            totalTicks: 24,
            masterSeed: 'auto_replay_slug_seed01',
            maxScripts: 64,
        }
        const first = await runUnattendedAutoScriptSimulation(base)
        expect(first.stackedCount).toBeGreaterThanOrEqual(4)
        const verdict = await verifyAutoScriptReplayDeterminism(base)
        expect(verdict.deterministic).toBe(true)
        expect(verdict.mismatchedFiles).toEqual([])
        expect(verdict.fileCount).toBeGreaterThanOrEqual(4)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('exports stacked batch to conductor ingress with SHA-256 parity', async () => {
        const repoRoot = makeTempRoot()
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'export-slug',
        )
        const conductorDir = path.join(
            repoRoot,
            'conductor-ingress',
            'export-slug',
            'auto-script',
        )
        await runUnattendedAutoScriptSimulation({
            seriesSlug: 'export-slug',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '21:00:00',
            tickSeconds: 3600,
            totalTicks: 24,
            masterSeed: 'auto_export_slug_seed01',
        })
        const result = await exportAutoScriptBatchToConductor({
            seriesSlug: 'export-slug',
            outputDir,
            repoRoot,
            conductorIngressDir: conductorDir,
        })
        expect(result.copiedCount).toBeGreaterThanOrEqual(4)
        expect(result.verified).toBe(true)
        const srcFiles = fs.readdirSync(outputDir).sort()
        const destFiles = fs.readdirSync(conductorDir).sort()
        expect(destFiles).toEqual(srcFiles)
        fs.rmSync(repoRoot, { recursive: true, force: true })
    })

    it('verifies 40-tick FEED-THE-COWS-01 wipe-replay and mutates stackDigestSha256 on startTime/seed change', async () => {
        const repoRoot = makeTempRoot()
        const outputDir = path.join(
            repoRoot,
            'drafts',
            'auto-script',
            'cows-slug',
        )
        const base = {
            seriesSlug: 'cows-slug',
            outputDir,
            repoRoot,
            startDate: '2026-10-31',
            startTime: '21:00:00',
            tickSeconds: 3600,
            totalTicks: 40,
            masterSeed: 'FEED-THE-COWS-01',
            maxScripts: 64,
        }
        const pass1 = await runUnattendedAutoScriptSimulation(base)
        expect(pass1.stackedCount).toBeGreaterThanOrEqual(3)

        const verdict = await verifyAutoScriptReplayDeterminism(base)
        expect(verdict.deterministic).toBe(true)
        expect(verdict.mismatchedFiles).toEqual([])
        expect(verdict.stackDigestSha256).toHaveLength(64)

        const shiftedTime = await verifyAutoScriptReplayDeterminism({
            ...base,
            startTime: '21:05:00',
        })
        expect(shiftedTime.deterministic).toBe(true)
        expect(shiftedTime.stackDigestSha256).not.toBe(
            verdict.stackDigestSha256,
        )

        const shiftedSeed = await verifyAutoScriptReplayDeterminism({
            ...base,
            masterSeed: 'FEED-THE-COWS-02',
        })
        expect(shiftedSeed.deterministic).toBe(true)
        expect(shiftedSeed.stackDigestSha256).not.toBe(
            verdict.stackDigestSha256,
        )

        fs.rmSync(repoRoot, { recursive: true, force: true })
    })
})
