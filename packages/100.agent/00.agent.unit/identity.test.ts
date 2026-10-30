import { describe, it, expect } from 'vitest'
import { getRepoIdentity, resolveRootPackageJson } from '../src/identity.js'

describe('Dynamic Repository Identity Resolver (100.agent)', () => {
    it('discovers root package.json and extracts dynamic identity', () => {
        const { pkg } = resolveRootPackageJson()
        expect(pkg.name).toBeDefined()
        expect(pkg.version).toBeDefined()
    })

    it('formats title banner using repo name followed by version number', () => {
        const { pkg } = resolveRootPackageJson()
        const identity = getRepoIdentity()
        const legacyToken = ['repo', 'bot'].join('-')
        expect(identity.name.toLowerCase()).not.toContain(legacyToken)
        expect(identity.name).toBe(pkg.name)
        expect(identity.titleBanner).toBe(`${pkg.name} v${pkg.version}`)
    })

    it('dynamically adapts when run against a downstream repo manifest', () => {
        const identity = getRepoIdentity(process.cwd())
        expect(identity.titleBanner).toContain(identity.name)
        expect(identity.titleBanner).toContain(identity.version)
    })
})
