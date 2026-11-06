import {
    CompileCharacterEntity,
    CompileCorpusPayload,
} from '../fce/compile.bit.js'

export interface FountainDialogueTurn {
    readonly turnIndex: number
    readonly lineNumber: number
    readonly rawCue: string
    readonly speakerCue: string
    readonly extension?: string
    readonly parentheticals: readonly string[]
    readonly dialogueLines: readonly string[]
    readonly text: string
}

export interface FountainDialogueSummary {
    readonly turns: readonly FountainDialogueTurn[]
    readonly totalTurns: number
    readonly bareTurns: number
    readonly contdTurns: number
    readonly johnnyTurns: number
    readonly orbieTurns: number
}

export type ParallaxViolationCode =
    | 'ERR_UNKNOWN_SPEAKER'
    | 'ERR_MUTE_CHARACTER_DIALOGUE'
    | 'ERR_MISSING_MOTOR_CAPABILITY'
    | 'ERR_MISSING_REQUIRED_PROP'
    | 'ERR_MISSING_REQUIRED_LOCATION'

export interface ParallaxPreflightViolation {
    readonly code: ParallaxViolationCode
    readonly entityId?: string
    readonly lineNumber?: number
    readonly message: string
}

export interface ParallaxPreflightReport {
    readonly valid: boolean
    readonly totalTurns: number
    readonly bareTurns: number
    readonly contdTurns: number
    readonly johnnyTurns: number
    readonly orbieTurns: number
    readonly turns: readonly FountainDialogueTurn[]
    readonly violations: readonly ParallaxPreflightViolation[]
}

// Extension-tolerant cue pattern matching bare cues and (CONT'D) / (O.S.) / (V.O.) cues
const CHARACTER_CUE_REGEX =
    /^([A-Z][A-Z0-9 .'-]*?)(?:\s*\((CONT'D|O\.S\.|V\.O\.)\))?$/

const NON_CUE_PREFIXES = [
    'INT.',
    'EXT.',
    'INT./EXT.',
    'I/E.',
    'FADE IN:',
    'FADE OUT.',
    'CUT TO:',
    '===',
]

function isCharacterCueHeader(
    trimmedLine: string,
    prevLineEmpty: boolean,
): boolean {
    if (!prevLineEmpty || trimmedLine.length === 0) {
        return false
    }
    if (trimmedLine.startsWith('>') || trimmedLine.startsWith('#')) {
        return false
    }
    for (const prefix of NON_CUE_PREFIXES) {
        if (trimmedLine.startsWith(prefix)) {
            return false
        }
    }
    if (trimmedLine.endsWith('TO:')) {
        return false
    }
    return CHARACTER_CUE_REGEX.test(trimmedLine)
}

export function tokenizeFountainDialogue(
    fountainText: string,
): FountainDialogueSummary {
    const lines = fountainText.replace(/\r\n/g, '\n').split('\n')
    const turns: FountainDialogueTurn[] = []

    let i = 0
    while (i < lines.length) {
        const rawLine = lines[i] ?? ''
        const trimmed = rawLine.trim()
        const prevEmpty = i === 0 || (lines[i - 1] ?? '').trim().length === 0

        if (isCharacterCueHeader(trimmed, prevEmpty)) {
            const match = CHARACTER_CUE_REGEX.exec(trimmed)
            if (match) {
                const speakerCue = (match[1] ?? '').trim()
                const extension = match[2] ? match[2].trim() : undefined
                const cueLineNumber = i + 1
                const parentheticals: string[] = []
                const dialogueLines: string[] = []

                i += 1
                while (i < lines.length) {
                    const blockLine = (lines[i] ?? '').trim()
                    if (blockLine.length === 0) {
                        break
                    }
                    if (blockLine.startsWith('(') && blockLine.endsWith(')')) {
                        parentheticals.push(blockLine)
                    } else {
                        dialogueLines.push(blockLine)
                    }
                    i += 1
                }

                if (dialogueLines.length > 0) {
                    turns.push({
                        turnIndex: turns.length + 1,
                        lineNumber: cueLineNumber,
                        rawCue: trimmed,
                        speakerCue,
                        ...(extension ? { extension } : {}),
                        parentheticals,
                        dialogueLines,
                        text: dialogueLines.join(' '),
                    })
                }
                continue
            }
        }
        i += 1
    }

    const contdTurns = turns.filter((t) => t.extension === "CONT'D").length
    const bareTurns = turns.length - contdTurns
    const johnnyTurns = turns.filter((t) => t.speakerCue === 'JOHNNY').length
    const orbieTurns = turns.filter((t) => t.speakerCue === 'ORBIE').length

    return {
        turns,
        totalTurns: turns.length,
        bareTurns,
        contdTurns,
        johnnyTurns,
        orbieTurns,
    }
}

const REQUIRED_MOTOR_CAPABILITIES: Readonly<Record<string, readonly string[]>> =
    {
        char_johnny_walkman: [
            'HEAVY_REACH',
            'VOCAL_TRACT',
            'FINE_MANIPULATION',
        ],
        char_orbie_mayhaw: [
            'EUCLIDEAN_POSTURE',
            'VOCAL_TRACT',
            'FINE_MANIPULATION',
        ],
    }

const REQUIRED_PROPS = [
    'pos_johnny_headset',
    'pos_orbie_trial_frame',
    'pos_orbie_gloves',
] as const

const REQUIRED_LOCATIONS = [
    'loc_dixie_starlight_lot',
    'loc_dixie_starlight_diner',
    'loc_orbie_airstream',
] as const

function resolveCharacterByCue(
    cue: string,
    characters: readonly CompileCharacterEntity[],
): CompileCharacterEntity | undefined {
    const normalized = cue.trim().toUpperCase()
    return characters.find((ch) => {
        if (ch.vocalCue?.toUpperCase() === normalized) {
            return true
        }
        if (ch.aliases?.some((a) => a.toUpperCase() === normalized)) {
            return true
        }
        return ch.name.toUpperCase() === normalized
    })
}

export function runParallaxPreflightGate(
    fountainText: string,
    corpus: CompileCorpusPayload,
): ParallaxPreflightReport {
    const summary = tokenizeFountainDialogue(fountainText)
    const violations: ParallaxPreflightViolation[] = []

    // 1. Validate every spoken dialogue turn against character somatic & vocal rules
    for (const turn of summary.turns) {
        const character = resolveCharacterByCue(
            turn.speakerCue,
            corpus.characters,
        )
        if (!character) {
            violations.push({
                code: 'ERR_UNKNOWN_SPEAKER',
                lineNumber: turn.lineNumber,
                message: `Line ${turn.lineNumber}: Unknown speaker cue "${turn.rawCue}" has no matching entity in corpus.characters.`,
            })
            continue
        }

        if (character.speakable === false) {
            violations.push({
                code: 'ERR_MUTE_CHARACTER_DIALOGUE',
                entityId: character.id,
                lineNumber: turn.lineNumber,
                message: `Line ${turn.lineNumber}: Non-speaking character "${character.id}" ("${turn.speakerCue}") cannot be assigned spoken dialogue.`,
            })
        }

        const mask = character.somaticState?.motorCapabilityMask ?? []
        if (!mask.includes('VOCAL_TRACT')) {
            violations.push({
                code: 'ERR_MISSING_MOTOR_CAPABILITY',
                entityId: character.id,
                lineNumber: turn.lineNumber,
                message: `Line ${turn.lineNumber}: Speaker "${character.id}" lacks mandatory "VOCAL_TRACT" motor capability.`,
            })
        }
    }

    // 2. Validate cast somatic capability masks for physical beats in The Parallax Dinner
    for (const [charId, requiredCaps] of Object.entries(
        REQUIRED_MOTOR_CAPABILITIES,
    )) {
        const character = corpus.characters.find((c) => c.id === charId)
        if (!character) {
            violations.push({
                code: 'ERR_UNKNOWN_SPEAKER',
                entityId: charId,
                message: `Required cast entity "${charId}" is missing from corpus.characters.`,
            })
            continue
        }
        const mask = character.somaticState?.motorCapabilityMask ?? []
        for (const cap of requiredCaps) {
            if (!mask.includes(cap)) {
                violations.push({
                    code: 'ERR_MISSING_MOTOR_CAPABILITY',
                    entityId: charId,
                    message: `Character "${charId}" is missing required somatic motor capability "${cap}".`,
                })
            }
        }
    }

    // 3. Validate required props
    const possessionIds = new Set(corpus.possessions.map((p) => p.id))
    for (const propId of REQUIRED_PROPS) {
        if (!possessionIds.has(propId)) {
            violations.push({
                code: 'ERR_MISSING_REQUIRED_PROP',
                entityId: propId,
                message: `Required screenplay prop "${propId}" is missing from corpus.possessions.`,
            })
        }
    }

    // 4. Validate required locations
    const locationIds = new Set(corpus.locations.map((l) => l.id))
    for (const locId of REQUIRED_LOCATIONS) {
        if (!locationIds.has(locId)) {
            violations.push({
                code: 'ERR_MISSING_REQUIRED_LOCATION',
                entityId: locId,
                message: `Required screenplay location "${locId}" is missing from corpus.locations.`,
            })
        }
    }

    return {
        valid: violations.length === 0,
        totalTurns: summary.totalTurns,
        bareTurns: summary.bareTurns,
        contdTurns: summary.contdTurns,
        johnnyTurns: summary.johnnyTurns,
        orbieTurns: summary.orbieTurns,
        turns: summary.turns,
        violations,
    }
}
