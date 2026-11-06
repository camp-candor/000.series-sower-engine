import { describe, expect, it } from 'vitest'
import {
    runParallaxPreflightGate,
    tokenizeFountainDialogue,
} from '../buz/parallax-preflight.buzz.js'
import { WIREGRASS_BASIN_CANON_CORPUS } from '../buz/wiregrass-canon.fixture.js'
import { CompileCorpusPayload } from '../fce/compile.bit.js'

const fs = process.getBuiltinModule('node:fs') as {
    readFileSync(filePath: string, encoding: BufferEncoding): string
}
const path = process.getBuiltinModule('node:path') as {
    resolve(...paths: string[]): string
}

describe('Phase III: Cast Somatic Capability & Dialogue Turn Pre-Flight Gate', () => {
    const fountainPath = path.resolve(
        process.cwd(),
        'drafts',
        'the_parallax_dinner.fountain',
    )
    const fountainText = fs.readFileSync(fountainPath, 'utf8')

    it("tokenizes all 34 dialogue blocks in drafts/the_parallax_dinner.fountain including all 7 (CONT'D) blocks", () => {
        const summary = tokenizeFountainDialogue(fountainText)

        expect(summary.totalTurns).toBe(34)
        expect(summary.bareTurns).toBe(27)
        expect(summary.contdTurns).toBe(7)
        expect(summary.johnnyTurns).toBe(17)
        expect(summary.orbieTurns).toBe(17)
    })

    it('passes runParallaxPreflightGate 100% green on drafts/the_parallax_dinner.fountain + WIREGRASS_BASIN_CANON_CORPUS', () => {
        const report = runParallaxPreflightGate(
            fountainText,
            WIREGRASS_BASIN_CANON_CORPUS,
        )

        expect(report.valid).toBe(true)
        expect(report.violations).toHaveLength(0)
        expect(report.totalTurns).toBe(34)
    })

    it('fails closed on unknown speaker cue (ERR_UNKNOWN_SPEAKER), mute speaker dialogue (ERR_MUTE_CHARACTER_DIALOGUE), and missing motor capabilities (ERR_MISSING_MOTOR_CAPABILITY)', () => {
        const scriptWithUnknownAndMute = [
            fountainText,
            '',
            'DRIFTER',
            'Got a light?',
            '',
            'WAITRESS',
            'Here is your coffee.',
        ].join('\n')

        const strippedCapabilityCorpus: CompileCorpusPayload = {
            ...WIREGRASS_BASIN_CANON_CORPUS,
            characters: WIREGRASS_BASIN_CANON_CORPUS.characters.map((ch) =>
                ch.id === 'char_orbie_mayhaw'
                    ? {
                          ...ch,
                          somaticState: {
                              ...ch.somaticState,
                              motorCapabilityMask: ['EUCLIDEAN_POSTURE'],
                          },
                      }
                    : ch,
            ),
        }

        const report = runParallaxPreflightGate(
            scriptWithUnknownAndMute,
            strippedCapabilityCorpus,
        )

        expect(report.valid).toBe(false)
        const codes = new Set(report.violations.map((v) => v.code))
        expect(codes.has('ERR_UNKNOWN_SPEAKER')).toBe(true)
        expect(codes.has('ERR_MUTE_CHARACTER_DIALOGUE')).toBe(true)
        expect(codes.has('ERR_MISSING_MOTOR_CAPABILITY')).toBe(true)
    })
})
