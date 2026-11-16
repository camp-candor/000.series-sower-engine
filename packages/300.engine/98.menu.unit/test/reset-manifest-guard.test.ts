import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
    ENGINE_RESET_MANIFEST,
    ENGINE_UNIT_RESET_REGISTRY,
    ENGINE_RELATIONAL_TABLES,
    validateEngineResetManifest,
    classifyEngineUnitReset,
} from '../../00.engine.unit/val/reset-manifest.val.js'
import {
    assertSafeEngineResetTarget,
    verifyEngineResetPerimeter,
} from '../buz/reset-guard.buzz.js'
import {
    TABULA_RASA_TOKEN_1,
    TABULA_RASA_TOKEN_2,
    TABULA_RASA_TOKEN_3,
} from '../fce/tabula-rasa.interface.js'

describe('Phase 1: Declarative Reset Manifest Contracts & Boundary Guards', () => {
    const tempDirs: string[] = []

    afterEach(() => {
        while (tempDirs.length > 0) {
            const dir = tempDirs.pop()!
            fs.rmSync(dir, { recursive: true, force: true })
        }
    })

    it('validates ENGINE_RESET_MANIFEST schema, 10 relational tables, and 26 BEE units', () => {
        const result = validateEngineResetManifest(ENGINE_RESET_MANIFEST)
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
        expect(ENGINE_RELATIONAL_TABLES).toHaveLength(10)
        expect(ENGINE_UNIT_RESET_REGISTRY).toHaveLength(26)

        const actorSpec = classifyEngineUnitReset('01.actor.unit')
        expect(actorSpec?.classification).toBe('STATEFUL_RESETTABLE')
        expect(actorSpec?.resetActionType).toBe('[Actor action] Reset Actor')

        const arithSpec = classifyEngineUnitReset('20.arithmetic.unit')
        expect(arithSpec?.classification).toBe('STATELESS_PURE')
    })

    it('exports deterministic Triple-Lock confirmation token constants', () => {
        expect(TABULA_RASA_TOKEN_1).toBe('CONFIRM_1_OF_3')
        expect(TABULA_RASA_TOKEN_2).toBe('CONFIRM_2_OF_3')
        expect(TABULA_RASA_TOKEN_3).toBe('CONFIRM_3_OF_3')
    })

    it('accepts valid purgeable spool paths inside engineRoot', async () => {
        const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-reset-'))
        tempDirs.push(sandbox)

        const compiledTarget = assertSafeEngineResetTarget(
            sandbox,
            path.join(sandbox, 'compiled', 'gotham-trinity-crisis'),
        )
        expect(compiledTarget).toContain('compiled')

        const draftsTarget = assertSafeEngineResetTarget(
            sandbox,
            path.join(sandbox, 'drafts', 'active_scene.fountain'),
        )
        expect(draftsTarget).toContain('drafts')

        const perimeter = await verifyEngineResetPerimeter(sandbox)
        expect(perimeter.ok).toBe(true)
        expect(perimeter.verifiedTargets).toHaveLength(4)
        expect(perimeter.receipts.at(-1)).toBe(
            '>> [RESET:GUARD] Perimeter verified [OK]',
        )
    })

    it('fails closed on engineRoot self-deletion, traversal, secrets, and protected paths', () => {
        const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-guard-'))
        tempDirs.push(sandbox)

        expect(() => assertSafeEngineResetTarget(sandbox, sandbox)).toThrow(
            /RESET_BOUNDARY_BREACH/,
        )
        expect(() =>
            assertSafeEngineResetTarget(sandbox, path.join(sandbox, '..')),
        ).toThrow(/RESET_BOUNDARY_BREACH/)
        expect(() =>
            assertSafeEngineResetTarget(
                sandbox,
                path.join(sandbox, 'apps', '995.library', '995.library'),
            ),
        ).toThrow(/RESET_BOUNDARY_BREACH/)
        expect(() =>
            assertSafeEngineResetTarget(
                sandbox,
                path.join(sandbox, 'packages', '300.engine'),
            ),
        ).toThrow(/RESET_BOUNDARY_BREACH/)
        expect(() =>
            assertSafeEngineResetTarget(sandbox, path.join(sandbox, '.env')),
        ).toThrow(/RESET_BOUNDARY_BREACH/)
        expect(() =>
            assertSafeEngineResetTarget(
                sandbox,
                path.join(sandbox, 'data', 'directive', 'day-000'),
            ),
        ).toThrow(/RESET_BOUNDARY_BREACH/)
        expect(() =>
            assertSafeEngineResetTarget(
                sandbox,
                path.join(sandbox, 'unregistered_folder'),
            ),
        ).toThrow(/RESET_BOUNDARY_BREACH/)
    })
})
