/**
 * 98.menu.unit - Protected Filesystem Boundary Guards for Tabula Rasa Reset
 * Enforces fail-closed path containment and protects immutable harness/source trees.
 */

import fs from 'node:fs'
import path from 'node:path'
import type State from '../../99.core/state.js'
import {
    ENGINE_PROTECTED_PATH_PREFIXES,
    ENGINE_PURGEABLE_TARGETS,
} from '../../00.engine.unit/val/reset-manifest.val.js'

const UPDATE_CONSOLE = '[Console action] Update Console'

function normalizePosix(relPath: string): string {
    return relPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

async function emitResetGuardTelemetry(
    ste: State | undefined,
    lines: readonly string[],
): Promise<void> {
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)

    for (const line of lines) {
        if (lib && typeof lib.hunt === 'function') {
            await lib
                .hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
                .catch(() => {})
        } else if (ste && typeof ste.hunt === 'function') {
            await ste
                .hunt(UPDATE_CONSOLE, { idx: 'cns00', src: line })
                .catch(() => {})
        }
    }
}

/**
 * Validates that candidatePath resides strictly inside engineRoot and never
 * intersects engineRoot itself or any protected system/source/harness path.
 * Fails closed by throwing [RESET_BOUNDARY_BREACH] on any violation.
 */
export function assertSafeEngineResetTarget(
    engineRoot: string,
    candidatePath: string,
): string {
    if (
        typeof engineRoot !== 'string' ||
        engineRoot.trim().length === 0 ||
        typeof candidatePath !== 'string' ||
        candidatePath.trim().length === 0
    ) {
        throw new Error(
            '[RESET_BOUNDARY_BREACH] Empty engineRoot or candidatePath rejected.',
        )
    }

    if (candidatePath.includes('\0') || engineRoot.includes('\0')) {
        throw new Error(
            '[RESET_BOUNDARY_BREACH] Null byte injection detected in reset target.',
        )
    }

    const rawSegments = candidatePath.split(/[/\\]/)
    if (rawSegments.includes('..')) {
        throw new Error(
            `[RESET_BOUNDARY_BREACH] Relative traversal segment '..' forbidden in '${candidatePath}'.`,
        )
    }

    const resolvedRoot = fs.existsSync(engineRoot)
        ? fs.realpathSync(engineRoot)
        : path.resolve(engineRoot)

    const resolvedCandidate = fs.existsSync(candidatePath)
        ? fs.realpathSync(candidatePath)
        : path.resolve(resolvedRoot, candidatePath)

    const relativeToRoot = path.relative(resolvedRoot, resolvedCandidate)
    const normalizedRel = normalizePosix(relativeToRoot)

    if (
        normalizedRel === '' ||
        normalizedRel === '.' ||
        normalizedRel.startsWith('..') ||
        path.isAbsolute(relativeToRoot)
    ) {
        throw new Error(
            `[RESET_BOUNDARY_BREACH] Target '${candidatePath}' resolves to root or escapes '${resolvedRoot}'.`,
        )
    }

    const firstSegment = normalizedRel.split('/')[0]
    if (
        firstSegment === '.env' ||
        firstSegment.startsWith('.env.') ||
        firstSegment === '.dev.vars' ||
        firstSegment.startsWith('.dev.vars.')
    ) {
        throw new Error(
            `[RESET_BOUNDARY_BREACH] Secret environment file '${normalizedRel}' is immutable.`,
        )
    }

    for (const protectedPrefix of ENGINE_PROTECTED_PATH_PREFIXES) {
        const cleanPrefix = normalizePosix(protectedPrefix)
        if (
            normalizedRel === cleanPrefix ||
            normalizedRel.startsWith(`${cleanPrefix}/`)
        ) {
            throw new Error(
                `[RESET_BOUNDARY_BREACH] Target '${normalizedRel}' intersects protected path '${cleanPrefix}'.`,
            )
        }
    }

    const allowedRoots = ENGINE_PURGEABLE_TARGETS.map((t) =>
        normalizePosix(t.relativePath),
    )
    const isInsideAllowedSpool = allowedRoots.some(
        (allowed) =>
            normalizedRel === allowed ||
            normalizedRel.startsWith(`${allowed}/`),
    )

    if (!isInsideAllowedSpool) {
        throw new Error(
            `[RESET_BOUNDARY_BREACH] Target '${normalizedRel}' is not declared in ENGINE_PURGEABLE_TARGETS.`,
        )
    }

    return resolvedCandidate
}

/**
 * Audits all declared purgeable targets against assertSafeEngineResetTarget
 * and streams 7-bit ASCII perimeter verification telemetry to cns00.
 */
export async function verifyEngineResetPerimeter(
    engineRoot: string,
    ste?: State,
): Promise<{
    ok: boolean
    verifiedTargets: string[]
    receipts: string[]
}> {
    const verifiedTargets: string[] = []
    const receipts: string[] = []

    for (const target of ENGINE_PURGEABLE_TARGETS) {
        const candidate = path.resolve(engineRoot, target.relativePath)
        const safePath = assertSafeEngineResetTarget(engineRoot, candidate)
        verifiedTargets.push(safePath)
        receipts.push(
            `>> [RESET:GUARD] Verified ${target.durabilityClass} target: ${target.relativePath} [OK]`,
        )
    }

    receipts.push('>> [RESET:GUARD] Perimeter verified [OK]')
    await emitResetGuardTelemetry(ste, receipts)

    return {
        ok: true,
        verifiedTargets,
        receipts,
    }
}
