import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getEngineKernelStatus } from '../../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('001.engine Workspace Boundary & Dependency Purity', () => {
    it('should verify kernel status and pure flag', () => {
        const status = getEngineKernelStatus()
        expect(status.pure).toBe(true)
        expect(status.service).toBe('@camp_candor/001.engine')
        expect(status.version).toBe('0.1.0')
    })

    it('should enforce zero Cloudflare or edge dependencies in package.json', () => {
        const pkgPath = resolve(__dirname, '../../package.json')
        expect(existsSync(pkgPath)).toBe(true)

        const raw = readFileSync(pkgPath, 'utf8')
        const pkg = JSON.parse(raw)

        const prohibitedTokens = [
            '@cloudflare/workers-types',
            '@cloudflare/vitest-pool-workers',
            'wrangler',
            'hono',
            'better-sqlite3',
            'drizzle-orm',
            'prisma',
            'knex',
        ]

        const allDeps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {}),
        }

        for (const token of prohibitedTokens) {
            expect(
                allDeps[token],
                `Prohibited dependency found: ${token}`,
            ).toBeUndefined()
        }
    })

    it('should confirm tsconfig enforces noEmit to prevent artifact leakage', () => {
        const tsconfigPath = resolve(__dirname, '../../tsconfig.json')
        expect(existsSync(tsconfigPath)).toBe(true)

        const raw = readFileSync(tsconfigPath, 'utf8')
        const tsconfig = JSON.parse(raw)

        expect(tsconfig.compilerOptions?.noEmit).toBe(true)
        expect(tsconfig.compilerOptions?.composite).toBe(true)
    })

    it('should contain zero prohibited tokens in kernel source', () => {
        const srcPath = resolve(__dirname, '../../src/index.ts')
        const source = readFileSync(srcPath, 'utf8')

        const prohibitedTokens = [
            '@cloudflare/workers-types',
            '@cloudflare/vitest-pool-workers',
            'wrangler',
            'hono',
            'better-sqlite3',
            'drizzle-orm',
            'prisma',
            'knex',
        ]

        for (const token of prohibitedTokens) {
            expect(source.includes(token)).toBe(false)
        }
    })
})
