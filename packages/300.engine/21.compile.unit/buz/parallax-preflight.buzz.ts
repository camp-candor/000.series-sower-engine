import {
    CompileCharacterEntity,
    CompileCorpusPayload,
    CompileGrievanceEntity,
    CompileLocationEntity,
    CompilePossessionEntity,
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
    readonly speakerTurns: Readonly<Record<string, number>>
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
    includes(substr: string): boolean
}

export class ParallaxViolationItem implements ParallaxPreflightViolation {
    readonly code: ParallaxViolationCode
    readonly entityId?: string
    readonly lineNumber?: number
    readonly message: string

    constructor(init: {
        code: ParallaxViolationCode
        entityId?: string
        lineNumber?: number
        message: string
    }) {
        this.code = init.code
        this.entityId = init.entityId
        this.lineNumber = init.lineNumber
        this.message = init.message
    }

    includes(substr: string): boolean {
        return (
            this.code.includes(substr) ||
            this.message.includes(substr) ||
            (this.entityId !== undefined && this.entityId.includes(substr))
        )
    }

    toString(): string {
        return `[${this.code}] ${this.message}`
    }
}

function makeViolation(init: {
    code: ParallaxViolationCode
    entityId?: string
    lineNumber?: number
    message: string
}): ParallaxPreflightViolation {
    return new ParallaxViolationItem(init)
}

export interface ParallaxPreflightReport {
    readonly valid: boolean
    readonly totalTurns: number
    readonly bareTurns: number
    readonly contdTurns: number
    readonly johnnyTurns: number
    readonly orbieTurns: number
    readonly speakerTurns: Readonly<Record<string, number>>
    readonly characterTurns: Readonly<Record<string, number>>
    readonly totalCues: number
    readonly contdCues: number
    readonly bareCues: number
    readonly turns: readonly FountainDialogueTurn[]
    readonly violations: readonly ParallaxPreflightViolation[]
}

export interface SeriesPreflightOptions {
    readonly requiredMotorCapabilities?: Readonly<
        Record<string, readonly string[]>
    >
    readonly requiredProps?: readonly string[]
    readonly requiredLocations?: readonly string[]
    readonly enforceWiregrassDefaults?: boolean
}

// Extension-tolerant cue pattern matching bare cues and (CONT'D) / (O.S.) / (V.O.) cues
const CHARACTER_CUE_REGEX =
    /^([A-Z][A-Z0-9 ._'()-]*?)(?:\s*\((CONT'D|O\.S\.|V\.O\.|OFF)\))?$/

const NON_CUE_PREFIXES = [
    'INT.',
    'EXT.',
    'INT./EXT.',
    'INT/EXT.',
    'I/E.',
    'EST.',
    'FADE IN:',
    'FADE OUT.',
    'CUT TO:',
    '===',
    '/*',
    '*/',
]

const TITLE_HEADER_PREFIX =
    /^(Title|Credit|Author|Draft date|Contact|Series|Scene):/i

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
    if (TITLE_HEADER_PREFIX.test(trimmedLine)) {
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
    let inBlockComment = false
    while (i < lines.length) {
        const rawLine = lines[i] ?? ''
        const trimmed = rawLine.trim()

        if (trimmed.startsWith('/*')) {
            if (!trimmed.includes('*/')) {
                inBlockComment = true
            }
            i += 1
            continue
        }
        if (inBlockComment) {
            if (trimmed.includes('*/')) {
                inBlockComment = false
            }
            i += 1
            continue
        }

        const prevRaw = i === 0 ? '' : (lines[i - 1] ?? '').trim()
        const prevEmpty =
            i === 0 || prevRaw.length === 0 || prevRaw.endsWith('*/')

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

    const speakerTurns: Record<string, number> = {}
    for (const turn of turns) {
        speakerTurns[turn.speakerCue] = (speakerTurns[turn.speakerCue] ?? 0) + 1
    }

    return {
        turns,
        totalTurns: turns.length,
        bareTurns,
        contdTurns,
        johnnyTurns,
        orbieTurns,
        speakerTurns: Object.freeze(speakerTurns),
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

export function deriveCanonicalCueFromCharacter(
    ch: CompileCharacterEntity,
): string {
    if (typeof ch.vocalCue === 'string' && ch.vocalCue.trim().length > 0) {
        return ch.vocalCue.trim().toUpperCase()
    }
    const rawName = (ch.name || ch.id || '').trim()
    const stripped = rawName
        .replace(/^(DR\.|MR\.|MRS\.|MS\.|MISS|PROF\.)\s+/i, '')
        .replace(/^char_/i, '')
        .replace(/_/g, ' ')
        .trim()
    const firstToken = stripped.split(/\s+/)[0] || stripped
    return (firstToken || rawName).toUpperCase()
}

export function resolveCharacterByCue(
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
        if (ch.name.toUpperCase() === normalized) {
            return true
        }
        if (ch.id.toUpperCase() === normalized) {
            return true
        }
        if (
            ch.id
                .replace(/^char_/i, '')
                .replace(/_/g, ' ')
                .toUpperCase() === normalized
        ) {
            return true
        }
        return deriveCanonicalCueFromCharacter(ch) === normalized
    })
}

export function coerceBibleStateToCompileCorpus(
    rawManifest: any,
): CompileCorpusPayload {
    if (!rawManifest || typeof rawManifest !== 'object') {
        return {
            characters: [],
            locations: [],
            possessions: [],
            grievances: [],
        }
    }

    if (
        Array.isArray(rawManifest.characters) &&
        Array.isArray(rawManifest.locations) &&
        Array.isArray(rawManifest.possessions) &&
        Array.isArray(rawManifest.grievances)
    ) {
        return rawManifest as CompileCorpusPayload
    }

    const entities = rawManifest.entities ?? rawManifest
    const characters: CompileCharacterEntity[] = []
    const locations: CompileLocationEntity[] = []
    const possessions: CompilePossessionEntity[] = []
    const grievances: CompileGrievanceEntity[] = []

    const pushCharacter = (id: string, raw: any) => {
        const name = String(raw?.name || raw?.title || id)
        const baseCue = deriveCanonicalCueFromCharacter({ id, name })
        const rawMask: string[] = Array.isArray(
            raw?.somaticState?.motorCapabilityMask,
        )
            ? [...raw.somaticState.motorCapabilityMask]
            : Array.isArray(raw?.motor_capability_mask)
              ? [...raw.motor_capability_mask]
              : ['VOCAL_TRACT', 'FINE_MANIPULATION']
        if (raw?.speakable !== false && !rawMask.includes('VOCAL_TRACT')) {
            rawMask.push('VOCAL_TRACT')
        }
        const aliases = new Set<string>([
            name.toUpperCase(),
            baseCue,
            id.toUpperCase(),
            id
                .replace(/^char_/i, '')
                .replace(/_/g, ' ')
                .toUpperCase(),
        ])
        if (Array.isArray(raw?.aliases)) {
            for (const a of raw.aliases) aliases.add(String(a).toUpperCase())
        }
        characters.push({
            ...raw,
            id,
            name,
            vocalCue: String(raw?.vocalCue || baseCue),
            aliases: [...aliases],
            speakable: raw?.speakable !== false,
            somaticState: {
                motorCapabilityMask: rawMask,
                enduranceBp: Number(
                    raw?.somaticState?.enduranceBp ?? raw?.endurance_bp ?? 8000,
                ),
                stressBp: Number(
                    raw?.somaticState?.stressBp ??
                        raw?.somatic_strain ??
                        raw?.paranoia ??
                        2000,
                ),
                coherenceBp: Number(
                    raw?.somaticState?.coherenceBp ?? raw?.trust ?? 7500,
                ),
            },
        })
    }

    const pushLocation = (id: string, raw: any) => {
        const connected = Array.isArray(raw?.connectedLocationIds)
            ? raw.connectedLocationIds
            : Array.isArray(raw?.adjacent_to)
              ? raw.adjacent_to
              : []
        locations.push({
            ...raw,
            id,
            name: String(raw?.name || raw?.title || id),
            connectedLocationIds: connected.map(String),
            capacityBp: Number(raw?.capacityBp ?? 5000),
        })
    }

    const pushPossession = (id: string, raw: any, fallbackHolderId: string) => {
        possessions.push({
            ...raw,
            id,
            name: String(raw?.name || raw?.title || id),
            holderCharacterId: String(
                raw?.holderCharacterId || raw?.owner_id || fallbackHolderId,
            ),
            durabilityBp: Number(raw?.durabilityBp ?? 8000),
        })
    }

    const pushGrievance = (id: string, raw: any, fallbackChars: string[]) => {
        const participants = Array.isArray(raw?.participants)
            ? raw.participants.map(String)
            : []
        const src = String(
            raw?.sourceCharacterId ||
                participants[0] ||
                fallbackChars[0] ||
                'char_a',
        )
        const dst = String(
            raw?.targetCharacterId ||
                participants[1] ||
                fallbackChars[1] ||
                fallbackChars[0] ||
                'char_b',
        )
        grievances.push({
            ...raw,
            id,
            sourceCharacterId: src,
            targetCharacterId: dst,
            intensityBp: Number(raw?.intensityBp ?? raw?.intensity_bp ?? 5000),
            dependsOnGrievanceIds: Array.isArray(raw?.dependsOnGrievanceIds)
                ? raw.dependsOnGrievanceIds.map(String)
                : [],
        })
    }

    if (
        entities &&
        typeof entities === 'object' &&
        (entities.characters ||
            entities.locations ||
            entities.possessions ||
            entities.items ||
            entities.grievances)
    ) {
        for (const [id, val] of Object.entries(entities.characters || {})) {
            pushCharacter(id, val)
        }
        for (const [id, val] of Object.entries(entities.locations || {})) {
            pushLocation(id, val)
        }
        const fallbackHolder = characters[0]?.id ?? 'char_default'
        for (const [id, val] of Object.entries(
            entities.possessions || entities.items || {},
        )) {
            pushPossession(id, val, fallbackHolder)
        }
        const charIds = characters.map((c) => c.id)
        for (const [id, val] of Object.entries(entities.grievances || {})) {
            pushGrievance(id, val, charIds)
        }
    } else if (entities && typeof entities === 'object') {
        const rawEntries = Object.entries(entities)
        for (const [id, val] of rawEntries) {
            if ((val as any)?.entity_type === 'character') {
                pushCharacter(id, val)
            } else if ((val as any)?.entity_type === 'location') {
                pushLocation(id, val)
            }
        }
        const fallbackHolder = characters[0]?.id ?? 'char_default'
        const charIds = characters.map((c) => c.id)
        for (const [id, val] of rawEntries) {
            const kind = (val as any)?.entity_type
            if (kind === 'item' || kind === 'possession') {
                pushPossession(id, val, fallbackHolder)
            } else if (kind === 'grievance') {
                pushGrievance(id, val, charIds)
            }
        }
    }

    return {
        characters,
        locations,
        possessions,
        grievances,
    }
}

export function runSeriesFountainPreflightGate(
    fountainText: string,
    corpus: CompileCorpusPayload,
    options?: SeriesPreflightOptions,
): ParallaxPreflightReport {
    const summary = tokenizeFountainDialogue(fountainText)
    const violations: ParallaxPreflightViolation[] = []
    const characterTurns: Record<string, number> = {}

    // 1. Validate every spoken dialogue turn against character somatic & vocal rules
    for (const turn of summary.turns) {
        const character = resolveCharacterByCue(
            turn.speakerCue,
            corpus.characters,
        )
        if (!character) {
            violations.push(
                makeViolation({
                    code: 'ERR_UNKNOWN_SPEAKER',
                    lineNumber: turn.lineNumber,
                    message: `Line ${turn.lineNumber}: Unknown speaker cue "${turn.rawCue}" has no matching entity in corpus.characters.`,
                }),
            )
            continue
        }

        characterTurns[character.id] = (characterTurns[character.id] ?? 0) + 1

        if (character.speakable === false) {
            violations.push(
                makeViolation({
                    code: 'ERR_MUTE_CHARACTER_DIALOGUE',
                    entityId: character.id,
                    lineNumber: turn.lineNumber,
                    message: `Line ${turn.lineNumber}: Non-speaking character "${character.id}" ("${turn.speakerCue}") cannot be assigned spoken dialogue.`,
                }),
            )
        }

        const mask = character.somaticState?.motorCapabilityMask ?? []
        if (!mask.includes('VOCAL_TRACT')) {
            violations.push(
                makeViolation({
                    code: 'ERR_MISSING_MOTOR_CAPABILITY',
                    entityId: character.id,
                    lineNumber: turn.lineNumber,
                    message: `Line ${turn.lineNumber}: Speaker "${character.id}" lacks mandatory "VOCAL_TRACT" motor capability.`,
                }),
            )
        }
    }

    const isWiregrassCorpus =
        options?.enforceWiregrassDefaults ??
        corpus.characters.some(
            (c) =>
                c.id === 'char_johnny_walkman' || c.id === 'char_orbie_mayhaw',
        )

    const requiredMotorCapabilities =
        options?.requiredMotorCapabilities ??
        (isWiregrassCorpus ? REQUIRED_MOTOR_CAPABILITIES : {})

    const requiredProps =
        options?.requiredProps ?? (isWiregrassCorpus ? REQUIRED_PROPS : [])

    const requiredLocations =
        options?.requiredLocations ??
        (isWiregrassCorpus ? REQUIRED_LOCATIONS : [])

    // 2. Validate cast somatic capability masks for physical beats
    for (const [charId, requiredCaps] of Object.entries(
        requiredMotorCapabilities,
    )) {
        const character = corpus.characters.find((c) => c.id === charId)
        if (!character) {
            violations.push(
                makeViolation({
                    code: 'ERR_UNKNOWN_SPEAKER',
                    entityId: charId,
                    message: `Required cast entity "${charId}" is missing from corpus.characters.`,
                }),
            )
            continue
        }
        const mask = character.somaticState?.motorCapabilityMask ?? []
        for (const cap of requiredCaps) {
            if (!mask.includes(cap)) {
                violations.push(
                    makeViolation({
                        code: 'ERR_MISSING_MOTOR_CAPABILITY',
                        entityId: charId,
                        message: `Character "${charId}" is missing required somatic motor capability "${cap}".`,
                    }),
                )
            }
        }
    }

    // 3. Validate required props
    const possessionIds = new Set(corpus.possessions.map((p) => p.id))
    for (const propId of requiredProps) {
        if (!possessionIds.has(propId)) {
            violations.push(
                makeViolation({
                    code: 'ERR_MISSING_REQUIRED_PROP',
                    entityId: propId,
                    message: `Required screenplay prop "${propId}" is missing from corpus.possessions.`,
                }),
            )
        }
    }

    // 4. Validate required locations
    const locationIds = new Set(corpus.locations.map((l) => l.id))
    for (const locId of requiredLocations) {
        if (!locationIds.has(locId)) {
            violations.push(
                makeViolation({
                    code: 'ERR_MISSING_REQUIRED_LOCATION',
                    entityId: locId,
                    message: `Required screenplay location "${locId}" is missing from corpus.locations.`,
                }),
            )
        }
    }

    return {
        valid: violations.length === 0,
        totalTurns: summary.totalTurns,
        bareTurns: summary.bareTurns,
        contdTurns: summary.contdTurns,
        johnnyTurns: summary.johnnyTurns,
        orbieTurns: summary.orbieTurns,
        speakerTurns: summary.speakerTurns,
        characterTurns: Object.freeze(characterTurns),
        totalCues: summary.totalTurns,
        contdCues: summary.contdTurns,
        bareCues: summary.bareTurns,
        turns: summary.turns,
        violations,
    }
}

export function runParallaxPreflightGate(
    fountainText: string,
    corpus: CompileCorpusPayload,
    options?: SeriesPreflightOptions,
): ParallaxPreflightReport {
    return runSeriesFountainPreflightGate(fountainText, corpus, options)
}
