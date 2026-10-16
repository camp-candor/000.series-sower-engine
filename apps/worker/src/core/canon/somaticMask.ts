// Phase 5: Somatic capability projection.
// Projects a character somatic profile into an integer movement budget
// and a negative mask of banned kinetic verbs. Departed actors are
// banned from all action via the '*' wildcard at zero budget.

export interface SomaticProfile {
    armsAvailable: number
    locomotionTier: 'UNRESTRICTED' | 'LIMPING' | 'IMMOBILIZED'
    openWounds: string[]
    status?: string
}

export interface SomaticProjection {
    movementBudgetUnits: number
    bannedKineticVerbs: Set<string>
}

export function getCharacterSomaticMask(
    profile: SomaticProfile,
): SomaticProjection {
    const banned = new Set<string>()

    if (profile.status === 'departed') {
        banned.add('*')
        return { movementBudgetUnits: 0, bannedKineticVerbs: banned }
    }

    let budget = 1000
    if (profile.locomotionTier === 'LIMPING') {
        budget = 400
        banned.add('SPRINT')
        banned.add('VAULT')
        banned.add('RUN')
    } else if (profile.locomotionTier === 'IMMOBILIZED') {
        budget = 0
        banned.add('SPRINT')
        banned.add('VAULT')
        banned.add('RUN')
        banned.add('WALK')
        banned.add('LIMP')
    }

    if (profile.armsAvailable < 2) {
        banned.add('BIMANUAL_CLIMB')
        banned.add('TWO_HANDED_LEVER')
    }
    if (profile.armsAvailable === 0) {
        banned.add('GRASP')
        banned.add('CARRY_HAND')
    }

    return { movementBudgetUnits: budget, bannedKineticVerbs: banned }
}
