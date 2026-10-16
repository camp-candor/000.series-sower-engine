// Phase 5: Somatic panopticon linter.
// Fail-closed T0 validator over emitted dialogue ASTs: hand-capacity
// saturation (held <= armsAvailable) plus O(1) set-membership checks of
// emitted kinetic verbs against each actor's banned-verb mask.

import type { DialogueAst } from '../../types/dialogueAst.js'
import type { SomaticProjection } from '../canon/somaticMask.js'

export interface LinterViolation {
    beatId: string
    speakerId: string
    code: 'SOMATIC_MOTOR_BREACH' | 'HAND_CAPACITY_BREACH'
    detail: string
}

export interface ActorLintContext {
    projection: SomaticProjection
    armsAvailable: number
}

export function lintDialogueAstSomaticInvariants(
    ast: DialogueAst,
    actorProjections: Record<string, ActorLintContext>,
): { valid: boolean; violations: LinterViolation[] } {
    const violations: LinterViolation[] = []

    for (const beat of ast.beats) {
        const actor = actorProjections[beat.speakerId]
        if (!actor) continue

        if (beat.heldItems.length > actor.armsAvailable) {
            violations.push({
                beatId: beat.beatId,
                speakerId: beat.speakerId,
                code: 'HAND_CAPACITY_BREACH',
                detail: `Actor requires ${beat.heldItems.length} hands, but has ${actor.armsAvailable} available.`,
            })
        }

        const banned = actor.projection.bannedKineticVerbs
        if (banned.has('*')) {
            violations.push({
                beatId: beat.beatId,
                speakerId: beat.speakerId,
                code: 'SOMATIC_MOTOR_BREACH',
                detail: 'Departed actor cannot execute kinetic actions.',
            })
            continue
        }

        for (const verb of beat.kineticVerbs) {
            if (banned.has(verb)) {
                violations.push({
                    beatId: beat.beatId,
                    speakerId: beat.speakerId,
                    code: 'SOMATIC_MOTOR_BREACH',
                    detail: `Actor attempted banned kinetic verb: ${verb}`,
                })
            }
        }
    }

    return {
        valid: violations.length === 0,
        violations,
    }
}
