import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
    TABULA_RASA_REQUIRED_AGENTS_HEADINGS,
    TABULA_RASA_REQUIRED_TOKENS,
    verifyAgentsTabulaRasaDocumentation,
} from '../buz/reset-doc-invariant.buzz.js'

function resolveRepoRoot(startDir: string): string {
    let curr = path.resolve(startDir)
    while (curr && curr !== path.dirname(curr)) {
        if (
            fs.existsSync(path.join(curr, 'AGENTS.md')) &&
            fs.existsSync(path.join(curr, 'packages', '300.engine'))
        ) {
            return curr
        }
        curr = path.dirname(curr)
    }
    return path.resolve(startDir)
}

describe('Task 1.4: Tabula Rasa Reversibility Invariants in AGENTS.md', () => {
    it('verifies live AGENTS.md contains all Tabula Rasa reversibility mandates in pure 7-bit ASCII', () => {
        const repoRoot = resolveRepoRoot(process.cwd())
        const agentsPath = path.join(repoRoot, 'AGENTS.md')
        expect(fs.existsSync(agentsPath)).toBe(true)

        const content = fs.readFileSync(agentsPath, 'utf8')
        const report = verifyAgentsTabulaRasaDocumentation(content)

        expect(report.asciiClean).toBe(true)
        expect(report.missingHeadings).toEqual([])
        expect(report.missingTokens).toEqual([])
        expect(report.valid).toBe(true)
    })

    it('fails closed when AGENTS.md omits required Tabula Rasa tokens or contains non-ASCII characters', () => {
        const incompleteDoc = [
            ...TABULA_RASA_REQUIRED_AGENTS_HEADINGS,
            'Partial doc missing tokens',
        ].join('\n')

        const missingReport = verifyAgentsTabulaRasaDocumentation(incompleteDoc)
        expect(missingReport.valid).toBe(false)
        expect(missingReport.missingTokens.length).toBe(
            TABULA_RASA_REQUIRED_TOKENS.length,
        )

        const nonAsciiDoc = [
            ...TABULA_RASA_REQUIRED_AGENTS_HEADINGS,
            ...TABULA_RASA_REQUIRED_TOKENS,
            'Invalid em-dash: \u2014',
        ].join('\n')

        const asciiReport = verifyAgentsTabulaRasaDocumentation(nonAsciiDoc)
        expect(asciiReport.asciiClean).toBe(false)
        expect(asciiReport.valid).toBe(false)
    })
})
