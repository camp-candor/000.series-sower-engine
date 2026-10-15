import { describe, it, expect } from 'vitest'
import { coreTools } from '../../src/tools.core.js'

describe('worker-sower-engine core tools verification', () => {
    it('strictly registers zero Git mutators or filesystem tools', () => {
        const toolNames = coreTools.map((t) => t.name)
        expect(toolNames).not.toContain('get_commit_sha')
        expect(toolNames).not.toContain('create_ephemeral_branch')
        expect(toolNames).not.toContain('write_repo_file')
        expect(toolNames).not.toContain('create_pull_request')
    })

    it('exposes the sanitized isolate diagnostic tool', async () => {
        const statusTool = coreTools.find(
            (t) => t.name === 'get_isolate_status',
        )
        expect(statusTool).toBeDefined()
        const result = await statusTool!.execute({}, { CANON_DB: {} })
        expect(result.service).toBe('worker-sower-engine')
        expect(result.status).toBe('ONLINE')
    })
})
