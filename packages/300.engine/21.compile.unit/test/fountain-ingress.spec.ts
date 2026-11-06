import { describe, expect, it } from 'vitest'
import {
    promoteEmbeddedDialogueCues,
    sanitizeFountainToAscii,
    validateFountainIngress,
} from '../buz/fountain-ingress.buzz.js'

const fs = process.getBuiltinModule('node:fs') as {
    readFileSync(filePath: string, encoding: BufferEncoding): string
}
const path = process.getBuiltinModule('node:path') as {
    resolve(...paths: string[]): string
}

describe('Phase I: Screenplay Pass 0 7-Bit ASCII Sanitization & Fountain Ingress', () => {
    it('sanitizes multi-byte UTF-8 em-dashes and curly apostrophes to 7-bit ASCII', () => {
        const raw =
            'Title: THE PARALLAX DINNER\n\n===\n\nJohnny\u2019s truck sways\u2014heavy and loud.\n'
        const { text, transliteratedCount } = sanitizeFountainToAscii(raw)

        expect(transliteratedCount).toBe(2)
        expect(text).toContain("Johnny's truck sways--heavy and loud.")

        const report = validateFountainIngress(text, transliteratedCount, 0)
        expect(report.valid).toBe(true)
        expect(report.asciiClean).toBe(true)
        expect(report.transliteratedCount).toBe(2)
        expect(report.violations).toHaveLength(0)
        expect(report.sha256).toMatch(/^[a-f0-9]{64}$/)
    })

    it('promotes embedded Orbie inline dialogue into a standalone ORBIE cue block while preserving normal action lines', () => {
        const sample = [
            'INT. DIXIE-STARLIGHT DINER - CONTINUOUS',
            '',
            'Orbie lifts a gloved hand. "No thank you, Miss Beverly. The steam compromises my progressive lenses."',
            '',
            'The Waitress nods and retreats.',
        ].join('\n')

        const { text, promotedCueCount } = promoteEmbeddedDialogueCues(sample)
        expect(promotedCueCount).toBe(1)
        expect(text).toContain(
            'Orbie lifts a gloved hand.\n\nORBIE\nNo thank you, Miss Beverly. The steam compromises my progressive lenses.',
        )
        expect(text).toContain('The Waitress nods and retreats.')
    })

    it('validates drafts/the_parallax_dinner.fountain on disk as 100% 7-bit ASCII clean and fails closed on raw UTF-8', () => {
        const fountainPath = path.resolve(
            process.cwd(),
            'drafts',
            'the_parallax_dinner.fountain',
        )
        const fountainText = fs.readFileSync(fountainPath, 'utf8')

        const report = validateFountainIngress(fountainText)
        expect(report.valid).toBe(true)
        expect(report.asciiClean).toBe(true)
        expect(report.violations).toHaveLength(0)
        expect(report.lineCount).toBeGreaterThan(200)

        const dirtyReport = validateFountainIngress(
            'Title: THE PARALLAX DINNER\n\n===\n\nUnfiltered em-dash \u2014 and apostrophe \u2019',
        )
        expect(dirtyReport.valid).toBe(false)
        expect(dirtyReport.asciiClean).toBe(false)
        expect(dirtyReport.violations.length).toBeGreaterThanOrEqual(2)
    })
})
