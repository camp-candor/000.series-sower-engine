import { describe, it, expect } from 'vitest'
import { getRepoIdentity, resolveRootPackageJson } from '../src/identity.js'

describe('Dynamic Repository Identity Resolver (000.agent)', () => {
    it('discovers root package.json and extracts dynamic identity', () => {
        const { pkg } = resolveRootPackageJson()
        expect(pkg.name).toBeDefined()
        expect(pkg.version).toBeDefined()
    })

    it('formats title banner using repo name followed by version number', () => {
        const identity = getRepoIdentity()
        const legacyToken = ['repo', 'bot'].join('-')
        expect(identity.name.toLowerCase()).not.toContain(legacyToken)
        expect(identity.name).toBe('series-sower-engine')
        expect(identity.titleBanner).toMatch(
            /^series-sower-engine v\d+\.\d+\.\d+$/,
        )
    })

    it('dynamically adapts when run against a downstream repo manifest', () => {
        const identity = getRepoIdentity(process.cwd())
        expect(identity.titleBanner).toContain(identity.name)
        expect(identity.titleBanner).toContain(identity.version)
    })
})
