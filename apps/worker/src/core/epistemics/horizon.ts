// Phase 5: Epistemic horizon gate (Ignorance by Omission).
// Withheld topics are scrubbed from prompt context entirely; permitted
// horizons inject explicit boundary directives instead of raw canon.
// The clue-lemma disjointness check fails closed: no permitted clue may
// intersect the forbidden trigger-lemma set.

export type EpistemicHorizon =
    | 'TOTAL_IGNORANCE'
    | 'RUMOR_ONLY'
    | 'FALSE_BELIEF'
    | 'PARTIAL_FACT'
    | 'WITHHELD'
    | 'UNRESOLVED_BY_CANON'

export interface MysteryDirective {
    topicId: string
    horizon: EpistemicHorizon
    injectedDirectives: string[]
    omittedTopicIds: string[]
}

export interface ClueLemmaContract {
    permittedClues: string[]
    triggerLemmas: string[]
}

export function compileEpistemicDirectives(
    actorId: string,
    topicId: string,
    horizon: EpistemicHorizon,
    distortedBelief?: string,
): MysteryDirective {
    void actorId
    const omitted: string[] = []
    const injected: string[] = []

    switch (horizon) {
        case 'TOTAL_IGNORANCE':
            omitted.push(topicId)
            break
        case 'RUMOR_ONLY':
            injected.push(
                `[UNVERIFIED HEARSAY: ${distortedBelief || 'vague chatter'}]`,
            )
            break
        case 'FALSE_BELIEF':
            injected.push(
                `[SUBJECTIVE CONVICTION: ${distortedBelief || 'absolute certainty'}]`,
            )
            break
        case 'WITHHELD':
            injected.push('[RESTRAINED KNOWLEDGE: Do not disclose root truth]')
            break
        case 'UNRESOLVED_BY_CANON':
            omitted.push(topicId)
            injected.push('[CANONICAL TABOO: Resolution forbidden]')
            break
        case 'PARTIAL_FACT':
            injected.push('[PERCEPTUAL EVIDENCE: Clues observed only]')
            break
    }

    return {
        topicId,
        horizon,
        injectedDirectives: injected,
        omittedTopicIds: omitted,
    }
}

// Disjointness theorem: P_clues intersect (union of T_lemmas) must be
// empty. Comparison is case-insensitive; any overlap returns false.
export function verifyClueLemmaDisjointness(
    contract: ClueLemmaContract,
): boolean {
    const triggerSet = new Set(
        contract.triggerLemmas.map((lemma) => lemma.toLowerCase()),
    )
    for (const clue of contract.permittedClues) {
        if (triggerSet.has(clue.toLowerCase())) {
            return false
        }
    }
    return true
}
