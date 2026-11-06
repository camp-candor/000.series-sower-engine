import { createHash } from 'node:crypto'

export interface FountainIngressReport {
    readonly valid: boolean
    readonly asciiClean: boolean
    readonly transliteratedCount: number
    readonly promotedCueCount: number
    readonly sha256: string
    readonly lineCount: number
    readonly violations: readonly string[]
}

const UTF8_TRANSLITERATION_TABLE: ReadonlyArray<readonly [RegExp, string]> = [
    [/\u2014/g, '--'],
    [/\u2013/g, '-'],
    [/[\u2018\u2019]/g, "'"],
    [/[\u201C\u201D]/g, '"'],
    [/\u2026/g, '...'],
    [/\u00A0/g, ' '],
]

export function sanitizeFountainToAscii(rawText: string): {
    readonly text: string
    readonly transliteratedCount: number
} {
    let text = rawText.replace(/\r\n/g, '\n')
    let transliteratedCount = 0

    for (let i = 0; i < text.length; i += 1) {
        if (text.charCodeAt(i) > 127) {
            transliteratedCount += 1
        }
    }

    for (const [pattern, replacement] of UTF8_TRANSLITERATION_TABLE) {
        text = text.replace(pattern, replacement)
    }

    return { text, transliteratedCount }
}

export function promoteEmbeddedDialogueCues(asciiText: string): {
    readonly text: string
    readonly promotedCueCount: number
} {
    const lines = asciiText.split('\n')
    const out: string[] = []
    let promotedCueCount = 0

    // Matches action prose where Orbie speaks inline quoted dialogue after a physical beat
    const inlineOrbiePattern =
        /^(.*?\bOrbie\b[^"]*?)\s*"([^"]+Miss Beverly\.[^"]+)"\s*$/

    for (const line of lines) {
        const match = inlineOrbiePattern.exec(line)
        if (match) {
            const actionPrefix = (match[1] ?? '').trim()
            const spokenLine = (match[2] ?? '').trim()
            if (actionPrefix.length > 0) {
                out.push(actionPrefix)
                out.push('')
            }
            out.push('ORBIE')
            out.push(spokenLine)
            promotedCueCount += 1
        } else {
            out.push(line)
        }
    }

    return { text: out.join('\n'), promotedCueCount }
}

export function validateFountainIngress(
    text: string,
    transliteratedCount = 0,
    promotedCueCount = 0,
): FountainIngressReport {
    const violations: string[] = []
    const lines = text.split(/\r?\n/)

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
        const line = lines[lineIdx] ?? ''
        for (let colIdx = 0; colIdx < line.length; colIdx += 1) {
            const code = line.charCodeAt(colIdx)
            if (code > 127) {
                violations.push(
                    `Non-ASCII byte U+${code.toString(16).toUpperCase().padStart(4, '0')} at line ${lineIdx + 1}, col ${colIdx + 1}`,
                )
            }
        }
    }

    if (!text.includes('Title: THE PARALLAX DINNER')) {
        violations.push(
            'Missing mandatory Fountain header "Title: THE PARALLAX DINNER"',
        )
    }
    if (!text.includes('\n===\n')) {
        violations.push('Missing mandatory Fountain page break "==="')
    }

    const sha256 = createHash('sha256').update(text, 'utf8').digest('hex')

    return {
        valid: violations.length === 0,
        asciiClean: violations.every((v) => !v.startsWith('Non-ASCII byte')),
        transliteratedCount,
        promotedCueCount,
        sha256,
        lineCount: lines.length,
        violations,
    }
}
