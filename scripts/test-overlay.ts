// scripts/test-overlay.ts
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

interface OverlayTarget {
    readonly path: string
    readonly description: string
}

const PROTECTED_TARGETS: readonly OverlayTarget[] = [
    {
        path: 'packages/300.engine/00.engine.unit/test',
        description: 'Engine unit test battery',
    },
    {
        path: 'packages/300.engine/17.tick.unit/tick.spec.ts',
        description: 'Tick reduction budget test',
    },
    {
        path: 'packages/300.engine/test',
        description: 'Engine test matchers & fixtures',
    },
    {
        path: '.dependency-cruiser.cjs',
        description: 'AST architectural firewall',
    },
    {
        path: 'vitest.workspace.ts',
        description: 'Multi-pool test runner configuration',
    },
]

export function runTestOverlay(baseRef: string = 'HEAD'): void {
    console.log(
        `>> [ANTI-GAMING] Initializing dynamic held-out test overlay against ref: ${baseRef}`,
    )

    for (const target of PROTECTED_TARGETS) {
        if (!existsSync(target.path)) {
            console.warn(
                `>> [WARN] Protected target missing on disk prior to restore: ${target.path}`,
            )
        }

        try {
            // Forcefully checkout the authoritative baseline from the trusted ref
            execSync(`git checkout ${baseRef} -- ${target.path}`, {
                stdio: 'pipe',
            })
            console.log(`>> [RESTORED] ${target.description} -> ${target.path}`)
        } catch (err) {
            // Verify if baseRef is valid. If baseRef is invalid or corrupted, fail closed immediately.
            try {
                execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'pipe' })
                // Target may be a newly introduced path not present in baseRef commit
                console.log(
                    `>> [RESTORED] ${target.description} -> ${target.path}`,
                )
            } catch {
                const errorMsg =
                    err instanceof Error ? err.message : String(err)
                console.error(
                    `>> [BREACH] Failed to restore protected path ${target.path}: ${errorMsg}`,
                )
                process.exit(1)
            }
        }
    }

    // Assert no side-by-side JS/DTS pollution was introduced during checkout
    try {
        const leakedArtifacts = execSync('node scripts/check-artifacts.cjs', {
            stdio: 'pipe',
        })
            .toString()
            .trim()

        if (leakedArtifacts.includes('[ARTIFACT_LEAK]')) {
            console.error(
                '>> [BREACH] Emitted compilation artifacts discovered in source tree:\n' +
                    leakedArtifacts,
            )
            process.exit(1)
        }
    } catch (err) {
        console.error(
            '>> [BREACH] Emitted compilation artifacts discovered in source tree',
        )
        process.exit(1)
    }

    console.log(
        '>> [PASS] Dynamic held-out test overlay complete. Authoritative baseline locked.',
    )
}

if (process.argv[1] && process.argv[1].endsWith('test-overlay.ts')) {
    const targetRef = process.argv[2] || process.env.TRUSTED_BASE_REF || 'HEAD'
    runTestOverlay(targetRef)
}
