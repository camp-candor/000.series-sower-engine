import { describe, it, expect } from 'vitest'
import { coreTools, createGetIsolateStatusTool, type Env } from '../../src/tools.core.js'

describe('Worker-Sower-Engine Tool Registry Sanitization', () => {
  const mockEnv: Env = {
    CANON_DB: {} as any,
    SOWER_SESSION: {} as any,
  }

  it('should export coreTools containing only read-only diagnostic tools', () => {
    const tools = coreTools(mockEnv)
    expect(tools.length).toBe(1)
    expect(tools[0].name).toBe('get_isolate_status')
  })

  it('should verify get_isolate_status executes successfully and returns diagnostic payload', async () => {
    const tool = createGetIsolateStatusTool(mockEnv)
    const result: any = await tool.execute('call-1', { detail_level: 'full' })

    expect(result).toBeDefined()
    expect(result.details).toBeDefined()
    expect(result.details.service).toBe('worker-sower-engine')
    expect(result.details.mode).toBe('READ_ONLY_SIMULATION_AUTHORITY')
    expect(result.details.hasCanonDb).toBe(true)
    expect(result.details.hasSowerSession).toBe(true)

    const parsedContent = JSON.parse(result.content[0].text)
    expect(parsedContent.action).toBe('ISOLATE_STATUS_CAPTURED')
  })

  it('should verify that all legacy Git DevOps mutator tools are absent from exports', async () => {
    const toolsModule = await import('../../src/tools.core.js')

    expect(toolsModule.createGetCommitShaTool).toBeUndefined()
    expect(toolsModule.createEphemeralBranchTool).toBeUndefined()
    expect(toolsModule.createWriteRepoFileTool).toBeUndefined()
    expect(toolsModule.createPullRequestTool).toBeUndefined()
    expect(toolsModule.assertSafeBranchRef).toBeUndefined()
    expect(toolsModule.PROTECTED_BRANCHES).toBeUndefined()
  })
})
