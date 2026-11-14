import { describe, expect, it } from 'vitest'
import {
    synthesizeEventFountainScreenplay,
    verifySixFountainCategories,
} from '../../21.compile.unit/buz/eventFountainSynth.buzz.js'
import {
    sanitizeFountainToAscii,
    validateFountainIngress,
} from '../../21.compile.unit/buz/fountain-ingress.buzz.js'

const CATEGORIES = [
    'PARANOIA_TRIGGERED',
    'GRIEVANCE_BREACH',
    'SOMATIC_TRAUMA',
    'INVENTORY_TRANSFER',
    'EPISTEMIC_REVEAL',
    'CHRONO_MILESTONE',
] as const

function buildInput(category: (typeof CATEGORIES)[number], tick: number) {
    return {
        seriesSlug: 'wiregrass-basin',
        displayName: 'Wiregrass Basin',
        masterSeed: 'seed_fountain_01',
        significantEvent: {
            eventSequence: tick,
            tick,
            clockSnapshot: {
                isoDate: '2026-10-31',
                clockTimeHm: '22:00',
                clockTimeHms: '22:00:00',
                timecodeSmpte: '01:00:00:00',
                daypart: 'NIGHT',
            },
            category,
            severityBps: 6000,
            triggerReason: `Test trigger for ${category}`,
            actorsInvolved: ['char_bog', 'char_wart'] as readonly string[],
            locationId: 'loc_culvert',
            stateDeltaSummary: `delta for ${category}`,
            causalHash: `causal_${category}_${tick}`,
        },
        clockBefore: {
            isoDate: '2026-10-31',
            clockTimeHm: '21:00',
            clockTimeHms: '21:00:00',
            timecodeSmpte: '00:00:00:00',
            daypart: 'NIGHT',
        },
        clockAfter: {
            isoDate: '2026-10-31',
            clockTimeHm: '22:00',
            clockTimeHms: '22:00:00',
            timecodeSmpte: '01:00:00:00',
            daypart: 'NIGHT',
            tickSeconds: 3600,
        },
    }
}

describe('Exhaustive Post-Event Fountain Synthesizer', () => {
    for (const category of CATEGORIES) {
        it(`synthesizes all six fountain categories for ${category}`, () => {
            const receipt = synthesizeEventFountainScreenplay(
                buildInput(category, 3),
            )
            const audit = verifySixFountainCategories(receipt.fountainText)
            expect(audit.hasSlugline).toBe(true)
            expect(audit.hasActionLines).toBe(true)
            expect(audit.hasCharacterCue).toBe(true)
            expect(audit.hasParenthetical).toBe(true)
            expect(audit.hasDialogue).toBe(true)
            expect(audit.hasTransition).toBe(true)
            expect(audit.hasDateHeader).toBe(true)
            expect(audit.hasStartTimeHm).toBe(true)
            expect(audit.allValid).toBe(true)
        })
    }

    it('is deterministic byte-for-byte across repeated calls', () => {
        const first = synthesizeEventFountainScreenplay(
            buildInput('SOMATIC_TRAUMA', 5),
        )
        const second = synthesizeEventFountainScreenplay(
            buildInput('SOMATIC_TRAUMA', 5),
        )
        expect(second.fountainText).toBe(first.fountainText)
        expect(second.contentSha256).toBe(first.contentSha256)
    })

    it('passes ascii sanitation and ingress validation', () => {
        const receipt = synthesizeEventFountainScreenplay(
            buildInput('GRIEVANCE_BREACH', 7),
        )
        const sanitized = sanitizeFountainToAscii(receipt.fountainText)
        expect(sanitized.text).toBe(receipt.fountainText)
        for (let i = 0; i < receipt.fountainText.length; i += 1) {
            expect(receipt.fountainText.charCodeAt(i) <= 127).toBe(true)
        }
        const report = validateFountainIngress(receipt.fountainText, 0, 0, {
            allowAnyTitle: true,
        })
        expect(report.valid).toBe(true)
        expect(report.violations).toEqual([])
    })

    it('validates all six categories through validateFountainIngress without undefined tokens', () => {
        for (const category of CATEGORIES) {
            const receipt = synthesizeEventFountainScreenplay(
                buildInput(category, 9),
            )
            expect(receipt.fountainText).not.toContain('undefined')
            const report = validateFountainIngress(receipt.fountainText, 0, 0, {
                allowAnyTitle: true,
            })
            expect(report.valid).toBe(true)
            expect(report.violations).toEqual([])
        }
    })

    it('rejects corrupted fountain scripts missing parentheticals or transitions', () => {
        const receipt = synthesizeEventFountainScreenplay(
            buildInput('PARANOIA_TRIGGERED', 2),
        )
        const noParenthetical = receipt.fountainText.replace(
            /^\([^)]+\)\r?\n/gm,
            '',
        )
        const auditNoParen = verifySixFountainCategories(noParenthetical)
        expect(auditNoParen.hasParenthetical).toBe(false)
        expect(auditNoParen.allValid).toBe(false)

        const noTransition = receipt.fountainText.replace(
            /CUT TO:|SMASH CUT TO:|TIME CUT:|FADE OUT\./g,
            '',
        )
        const auditNoTrans = verifySixFountainCategories(noTransition)
        expect(auditNoTrans.hasTransition).toBe(false)
        expect(auditNoTrans.allValid).toBe(false)
    })
})
