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

export interface FountainIngressOptions {
    readonly expectedTitle?: string
    readonly allowAnyTitle?: boolean
    readonly requirePageBreak?: boolean
    readonly characterCues?: ReadonlyArray<{
        readonly inlineName: string
        readonly cue: string
    }>
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

    // Fallback strip/transliterate any remaining >127 byte so output is 100% 7-bit ASCII
    let residualClean = ''
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i)
        residualClean += code <= 127 ? text[i] : '?'
    }

    return { text: residualClean, transliteratedCount }
}

function escapeRegExp(literal: string): string {
    return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function promoteEmbeddedDialogueCues(
    asciiText: string,
    characterCues?: ReadonlyArray<{
        readonly inlineName: string
        readonly cue: string
    }>,
): {
    readonly text: string
    readonly promotedCueCount: number
} {
    const lines = asciiText.split('\n')
    const out: string[] = []
    let promotedCueCount = 0

    // Matches action prose where Orbie speaks inline quoted dialogue after a physical beat
    const inlineOrbiePattern =
        /^(.*?\bOrbie\b[^"]*?)\s*"([^"]+Miss Beverly\.[^"]+)"\s*$/

    const dynamicPatterns = (characterCues ?? [])
        .filter(
            (c) => c.inlineName.trim().length > 0 && c.cue.trim().length > 0,
        )
        .map((c) => ({
            cue: c.cue.trim().toUpperCase(),
            pattern: new RegExp(
                `^(.*?\\b${escapeRegExp(c.inlineName.trim())}\\b[^"]*?)\\s*"([^"]+)"\\s*$`,
            ),
        }))

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
            continue
        }

        let matchedDynamic = false
        for (const dyn of dynamicPatterns) {
            const dynMatch = dyn.pattern.exec(line)
            if (dynMatch) {
                const actionPrefix = (dynMatch[1] ?? '').trim()
                const spokenLine = (dynMatch[2] ?? '').trim()
                if (actionPrefix.length > 0) {
                    out.push(actionPrefix)
                    out.push('')
                }
                out.push(dyn.cue)
                out.push(spokenLine)
                promotedCueCount += 1
                matchedDynamic = true
                break
            }
        }

        if (!matchedDynamic) {
            out.push(line)
        }
    }

    return { text: out.join('\n'), promotedCueCount }
}

export function validateFountainIngress(
    text: string,
    transliteratedCount = 0,
    promotedCueCount = 0,
    options?: FountainIngressOptions,
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

    if (options?.allowAnyTitle) {
        if (!/^Title:\s*\S+/m.test(text)) {
            violations.push('Missing mandatory Fountain "Title:" header')
        }
    } else {
        const expectedTitle = options?.expectedTitle ?? 'THE PARALLAX DINNER'
        const requiredHeader = `Title: ${expectedTitle}`
        if (!text.includes(requiredHeader)) {
            violations.push(
                `Missing mandatory Fountain header "${requiredHeader}"`,
            )
        }
    }

    if (options?.requirePageBreak !== false && !text.includes('\n===\n')) {
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
