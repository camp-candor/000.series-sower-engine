import { createHash } from 'node:crypto'
import { sanitizeFountainToAscii } from './fountain-ingress.buzz.js'
import type {
    SixCategoryScreenplayAudit,
    SynthesizedEventScreenplay,
} from '../fce/compile.interface.js'

export type EventCategoryInput =
    | 'PARANOIA_TRIGGERED'
    | 'GRIEVANCE_BREACH'
    | 'SOMATIC_TRAUMA'
    | 'INVENTORY_TRANSFER'
    | 'EPISTEMIC_REVEAL'
    | 'CHRONO_MILESTONE'

export interface PacingContextStamp {
    readonly actStage?: 'ACT_I' | 'ACT_II' | 'ACT_III'
    readonly actMultiplierBps?: number
    readonly diurnalWeightBps?: number
    readonly droughtTicks?: number
    readonly droughtBreaker?: boolean
    readonly cooldownWindowTicks?: number
}

export interface SynthesizeEventScreenplayInput {
    readonly seriesSlug: string
    readonly displayName?: string
    readonly masterSeed: string
    readonly pacing?: PacingContextStamp
    readonly significantEvent: {
        readonly eventSequence: number
        readonly tick: number
        readonly clockSnapshot: {
            readonly isoDate: string
            readonly clockTimeHm: string
            readonly clockTimeHms: string
            readonly timecodeSmpte: string
            readonly daypart: string
        }
        readonly category: EventCategoryInput
        readonly severityBps: number
        readonly triggerReason: string
        readonly actorsInvolved: readonly string[]
        readonly locationId: string
        readonly stateDeltaSummary: string
        readonly causalHash: string
    }
    readonly clockBefore: {
        readonly isoDate: string
        readonly clockTimeHm: string
        readonly clockTimeHms: string
        readonly timecodeSmpte: string
        readonly daypart: string
    }
    readonly clockAfter: {
        readonly isoDate: string
        readonly clockTimeHm: string
        readonly clockTimeHms: string
        readonly timecodeSmpte: string
        readonly daypart: string
        readonly tickSeconds?: number
    }
    readonly corpus?: {
        readonly characters?: readonly {
            readonly id: string
            readonly name?: string
        }[]
        readonly locations?: readonly {
            readonly id: string
            readonly name?: string
        }[]
    }
    readonly voiceLexicon?: Partial<Record<string, readonly string[]>>
    readonly locationProfiles?: Partial<Record<string, string>>
    readonly spatialBrief?: {
        readonly coordsQ?: number
        readonly coordsR?: number
        readonly luminanceBps?: number
        readonly noiseCdB?: number
    }
}

function localUint32(masterSeed: string, tick: number, salt: string): number {
    let hash = 0x811c9dc5
    const input = `${masterSeed}:${tick}:${salt}`
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    let t = ((hash >>> 0) + 0x6d2b79f5) >>> 0
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
}

function pickFrom<T>(items: readonly T[], index: number): T {
    return items[index % items.length] as T
}

function canonicalCue(actorId: string): string {
    const cleaned = actorId
        .replace(/^char_/, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .toUpperCase()
    return cleaned.length > 0 ? cleaned : 'ENSEMBLE'
}

function locationName(
    locationId: string,
    locationProfiles?: Partial<Record<string, string>>,
): string {
    const profiled = locationProfiles?.[locationId]
    if (profiled != null && profiled.trim().length > 0) return profiled.trim()
    return locationId.replace(/^loc_/, '').replace(/_/g, ' ')
}

function categoryActionBeats(
    category: EventCategoryInput,
    triggerReason: string,
    delta: string,
): string[] {
    const base = `[POST-EVENT STATE] ${triggerReason} :: ${delta}`
    switch (category) {
        case 'PARANOIA_TRIGGERED':
            return [
                base,
                'Dread settles across the room as breath shortens and glances lock toward the dark pipe seam.',
                'Hands grip cold metal while the ensemble maps exits without speaking the fear aloud.',
            ]
        case 'GRIEVANCE_BREACH':
            return [
                base,
                'The old debt snaps taut as shoulders square and weight shifts toward confrontation.',
                'A claimed slight becomes open ledger, measured in held breath and narrowed distance.',
            ]
        case 'SOMATIC_TRAUMA':
            return [
                base,
                'Pain spikes through the injured limb as posture buckles and movement narrows to a guarded limp.',
                'Breath hitches while the others clear space, marking the new limit of traversal.',
            ]
        case 'INVENTORY_TRANSFER':
            return [
                base,
                'The critical object changes hands with deliberate weight, grip to grip, under watchful lamplight.',
                'Possession redefines leverage as the prior holder steps back, emptied and recalculating.',
            ]
        case 'EPISTEMIC_REVEAL':
            return [
                base,
                'A false account collapses as the witness names the contradiction plainly for all to hear.',
                'Silence follows the reveal while each listener revises what was taken as settled.',
            ]
        case 'CHRONO_MILESTONE':
            return [
                base,
                'Light shifts across the culvert mouth as the hour turns and shadows lengthen along wet stone.',
                'The ensemble marks the new daypart with rationed motion, conserving strength for the next leg.',
            ]
    }
}

function categoryDialogue(
    category: EventCategoryInput,
    cueA: string,
    cueB: string,
    triggerReason: string,
    pick: number,
): Array<{ cue: string; parenthetical: string; line: string }> {
    const lines: Record<EventCategoryInput, string[]> = {
        PARANOIA_TRIGGERED: [
            'It crossed the line. I felt it cross.',
            'Then we name it and stand watch together.',
            'No one drifts alone until the count settles.',
            'Hold the lamp steady. Count with me.',
        ],
        GRIEVANCE_BREACH: [
            'You owe for that slight, and tonight it comes due.',
            'Then test me now, ledger open, witnesses present.',
            'Enough. The debt is spoken and will be answered.',
            'Answer with action, not with circling.',
        ],
        SOMATIC_TRAUMA: [
            'My leg gives. Do not leave me to crawl it.',
            'Lean on me. We narrow the pace and keep moving.',
            'Pain writes the new rule. We obey it.',
            'Wrap it tight. Breathe with me on three.',
        ],
        INVENTORY_TRANSFER: [
            'This passes to me now. It is decided.',
            'Take it, and carry the weight that follows.',
            'The transfer is witnessed. Record it true.',
            'Guard it with both hands until dawn.',
        ],
        EPISTEMIC_REVEAL: [
            'That story was false, and I can prove it.',
            'Speak the proof, then we rebuild from fact.',
            'The contradiction stands. We adjust course.',
            'Truth first, blame after the lamp is refilled.',
        ],
        CHRONO_MILESTONE: [
            'The hour has turned. Mark it and move.',
            'Then we ration steps to the new light.',
            'Dusk settles the count. Rest in shifts.',
            'Dawn will test us. Conserve until then.',
        ],
    }
    const pool = lines[category]
    const parentheticals = [
        '(low, measured, holding back alarm)',
        '(steady, meeting each gaze in turn)',
        '(strained, breath short from pain)',
        '(quiet, resolute, hands firm)',
    ]
    const a1 = pool[(pick + 0) % pool.length] as string
    const b1 = pool[(pick + 1) % pool.length] as string
    const a2 = pool[(pick + 2) % pool.length] as string
    const b2 = pool[(pick + 3) % pool.length] as string
    return [
        {
            cue: cueA,
            parenthetical: parentheticals[(pick + 0) % 4] as string,
            line: `${a1} ${triggerReason.slice(0, 0)}`.trim(),
        },
        {
            cue: cueB,
            parenthetical: parentheticals[(pick + 1) % 4] as string,
            line: b1,
        },
        {
            cue: cueA,
            parenthetical: parentheticals[(pick + 2) % 4] as string,
            line: a2,
        },
        {
            cue: cueB,
            parenthetical: parentheticals[(pick + 3) % 4] as string,
            line: b2,
        },
    ]
}

export const verifySixFountainCategories = (
    fountainText: string,
): SixCategoryScreenplayAudit => {
    const lines = fountainText.split('\n')
    const hasSlugline = lines.some((l) =>
        /^(INT|EXT)\.\s+\S+.*-.*\(.*\d{2}:\d{2}.*\)/.test(l.trim()),
    )
    const actionCount = lines.filter((l) => {
        const t = l.trim()
        if (t.length < 20) return false
        if (/^(INT|EXT)\./.test(t)) return false
        if (/^[A-Z0-9 _.'-]{2,}$/.test(t) && t === t.toUpperCase()) return false
        if (/^\(.*\)$/.test(t)) return false
        if (/^>/.test(t)) return false
        if (/^(CUT TO|SMASH CUT TO|FADE OUT|TIME CUT)/.test(t)) return false
        if (/^[A-Za-z]+:/.test(t)) return false
        if (/^\/\*/.test(t)) return false
        if (/^===/.test(t)) return false
        if (t === '') return false
        return true
    }).length
    const hasActionLines = actionCount >= 2
    const hasCharacterCue = lines.some(
        (l) =>
            /^[A-Z0-9 _.'-]{2,}$/.test(l.trim()) &&
            l.trim() === l.trim().toUpperCase() &&
            l.trim().length >= 2 &&
            !/^(INT|EXT)\./.test(l.trim()) &&
            !/:/.test(l.trim()),
    )
    const hasParenthetical = lines.some((l) => /^\(.+\)$/.test(l.trim()))
    const cueIndexes: number[] = []
    lines.forEach((l, i) => {
        const t = l.trim()
        if (
            /^[A-Z0-9 _.'-]{2,}$/.test(t) &&
            t === t.toUpperCase() &&
            t.length >= 2 &&
            !/^(INT|EXT)\./.test(t) &&
            !/:/.test(t)
        ) {
            cueIndexes.push(i)
        }
    })
    let hasDialogue = false
    for (const idx of cueIndexes) {
        const next1 = (lines[idx + 1] ?? '').trim()
        const next2 = (lines[idx + 2] ?? '').trim()
        const spoken = /^\(.+\)$/.test(next1) ? next2 : next1
        if (
            spoken.length > 0 &&
            !/^[A-Z0-9 _.'-]{2,}$/.test(spoken) &&
            !/^\(.*\)$/.test(spoken) &&
            !/^>/.test(spoken) &&
            !/^(INT|EXT)\./.test(spoken) &&
            !/^[A-Za-z]+:/.test(spoken)
        ) {
            hasDialogue = true
            break
        }
    }
    const hasTransition = /CUT TO:|SMASH CUT TO:|TIME CUT:|FADE OUT\./.test(
        fountainText,
    )
    const hasDateHeader = /^Date:\s*\d{4}-\d{2}-\d{2}/m.test(fountainText)
    const hasStartTimeHm = /^Start-Time:\s*\d{2}:\d{2}/m.test(fountainText)
    const allValid =
        hasSlugline &&
        hasActionLines &&
        hasCharacterCue &&
        hasParenthetical &&
        hasDialogue &&
        hasTransition &&
        hasDateHeader &&
        hasStartTimeHm
    return {
        hasSlugline,
        hasActionLines,
        hasCharacterCue,
        hasParenthetical,
        hasDialogue,
        hasTransition,
        hasDateHeader,
        hasStartTimeHm,
        allValid,
    }
}

export const synthesizeEventFountainScreenplay = (
    input: SynthesizeEventScreenplayInput,
): SynthesizedEventScreenplay => {
    const evt = input.significantEvent
    const before = input.clockBefore
    const after = input.clockAfter
    const seriesSlug = input.seriesSlug
    const displayName = input.displayName ?? seriesSlug
    const locId = evt.locationId
    const locName = locationName(locId, input.locationProfiles)
    const locUpper = locName.toUpperCase()
    const interior = locId.includes('ext') ? 'EXT.' : 'INT.'
    const slugline = `${interior} ${locUpper} - ${after.daypart} (${after.clockTimeHm})`
    const actors =
        evt.actorsInvolved.length > 0
            ? evt.actorsInvolved
            : ['char_bog', 'char_wart']
    const cueA = canonicalCue(actors[0] as string)
    const cueB = canonicalCue((actors[1] as string) ?? 'char_wart')
    const pick =
        localUint32(input.masterSeed, evt.tick, `${evt.category}:dialogue`) % 4
    const lexA = input.voiceLexicon?.[actors[0] as string]
    const lexB = input.voiceLexicon?.[(actors[1] as string) ?? '']
    void lexA
    void lexB
    const beats = categoryActionBeats(
        evt.category,
        evt.triggerReason,
        evt.stateDeltaSummary,
    )
    const spatial = input.spatialBrief
    const spatialLine =
        spatial != null
            ? `Blocking grid (q=${spatial.coordsQ ?? 0}, r=${spatial.coordsR ?? 0}) luminance ${spatial.luminanceBps ?? 3000} bps ambient ${spatial.noiseCdB ?? 1500} cdB.`
            : 'Blocking holds tight near the culvert seam, lamp low, sound damped by wet stone.'
    const tickSeconds = after.tickSeconds ?? 60
    const lines: string[] = []
    lines.push(`Title: ${displayName} ${evt.eventSequence}_${evt.category}`)
    lines.push(`Credit: Generated by 300.engine Autonomous Script Forge`)
    lines.push(`Author: Autonomous Script Forge`)
    lines.push(`Series: ${seriesSlug}`)
    lines.push(
        `Scene: ${String(evt.eventSequence).padStart(4, '0')}_${evt.category}`,
    )
    lines.push(`Date: ${after.isoDate}`)
    lines.push(`Start-Time: ${before.clockTimeHm}`)
    lines.push(`End-Time: ${after.clockTimeHm}`)
    const durationMin = Math.floor(tickSeconds / 60)
    lines.push(`Duration: ${durationMin} min`)
    lines.push(`Timecode: ${after.timecodeSmpte}`)
    lines.push(`Daypart: ${after.daypart}`)
    lines.push(`Chronology-Delta: +${tickSeconds}s (Tick ${evt.tick})`)
    lines.push(`Event-Sequence: ${evt.eventSequence}`)
    lines.push(`Event-Category: ${evt.category}`)
    lines.push(`Master-Seed: ${input.masterSeed}`)
    lines.push(`Causal-Hash: ${evt.causalHash}`)
    const pacing = input.pacing
    const actStage = pacing?.actStage ?? 'ACT_I'
    const actMult = pacing?.actMultiplierBps ?? 10000
    const diurnalW = pacing?.diurnalWeightBps ?? 10000
    const droughtTicks = pacing?.droughtTicks ?? 0
    const cooldownWindow = pacing?.cooldownWindowTicks ?? 0
    const isBreaker = pacing?.droughtBreaker === true
    lines.push(`Act: ${actStage}`)
    lines.push(`Pacing-Multiplier-Bps: ${actMult}`)
    lines.push(`Diurnal-Weight-Bps: ${diurnalW}`)
    lines.push(`Drought-Ticks: ${droughtTicks}`)
    lines.push(`Drought-Breaker: ${isBreaker ? 'TRUE' : 'FALSE'}`)
    lines.push(`Cooldown-Window-Ticks: ${cooldownWindow}`)
    lines.push('')
    lines.push(
        `/* [SPATIAL_STAGE_HEADER] ${locName} q=${spatial?.coordsQ ?? 0} r=${spatial?.coordsR ?? 0} lum=${spatial?.luminanceBps ?? 3000}bps noise=${spatial?.noiseCdB ?? 1500}cdB */`,
    )
    lines.push('===')
    lines.push('')
    lines.push(slugline)
    lines.push('')
    lines.push(spatialLine)
    lines.push('')
    for (const beat of beats) {
        lines.push(beat)
        lines.push('')
    }
    const turns = categoryDialogue(
        evt.category,
        cueA,
        cueB,
        evt.triggerReason,
        pick,
    )
    for (const turn of turns) {
        lines.push(turn.cue)
        lines.push(turn.parenthetical)
        lines.push(turn.line)
        lines.push('')
    }
    const transitionPick =
        localUint32(input.masterSeed, evt.tick, `${evt.category}:transition`) %
        3
    const actITransitions = [
        `DISSOLVE TO:`,
        `> CUT TO:`,
        `TIME CUT: ${after.isoDate} ${after.clockTimeHm} (${after.daypart})`,
    ]
    const actIIITransitions = [
        `SMASH CUT TO:`,
        `MATCH CUT TO:`,
        `TIME CUT: ${after.isoDate} ${after.clockTimeHm} (${after.daypart})`,
    ]
    const defaultTransitions = [
        `> CUT TO:`,
        `SMASH CUT TO:`,
        `TIME CUT: ${after.isoDate} ${after.clockTimeHm} (${after.daypart})`,
    ]
    const transitions =
        actStage === 'ACT_I'
            ? actITransitions
            : actStage === 'ACT_III' || isBreaker
              ? actIIITransitions
              : defaultTransitions
    lines.push(pickFrom(transitions, transitionPick))
    lines.push('')
    lines.push('FADE OUT.')
    lines.push('')
    const rawText = lines.join('\n')
    const sanitized = sanitizeFountainToAscii(rawText)
    const fountainText = sanitized.text
    const contentSha256 = createHash('sha256')
        .update(fountainText, 'utf8')
        .digest('hex')
    const sceneSummaryAst = {
        seriesSlug,
        eventSequence: evt.eventSequence,
        tick: evt.tick,
        category: evt.category,
        isoDate: after.isoDate,
        clockTimeHm: after.clockTimeHm,
        daypart: after.daypart,
        triggerReason: evt.triggerReason,
        severityBps: evt.severityBps,
        pacing: {
            actStage,
            actMultiplierBps: actMult,
            diurnalWeightBps: diurnalW,
            droughtTicks,
            droughtBreaker: isBreaker,
            cooldownWindowTicks: cooldownWindow,
        },
    }
    return { fountainText, contentSha256, sceneSummaryAst }
}
