/**
 * 10.location.unit - Traversal Budget Guard Buzzer
 * Enforces fail-closed halting when spatial traversal exceeds somatic energy budget.
 */

export interface BudgetGuardResult {
    readonly permitted: boolean
    readonly traversalCostUnits: number
    readonly allowedBudgetUnits: number
    readonly marginUnits: number
    readonly error?: string
}

export const verifyTraversalBudget = (
    traversalCostUnits: number,
    allowedBudgetUnits: number,
): BudgetGuardResult => {
    if (
        !Number.isInteger(traversalCostUnits) ||
        !Number.isInteger(allowedBudgetUnits)
    ) {
        throw new Error(
            '[BUDGET_GUARD_ERROR] Budget and traversal costs must be discrete integers',
        )
    }

    const marginUnits = allowedBudgetUnits - traversalCostUnits
    const permitted = marginUnits >= 0

    return Object.freeze({
        permitted,
        traversalCostUnits,
        allowedBudgetUnits,
        marginUnits,
        error: permitted
            ? undefined
            : `BUDGET_EXCEEDED: Traversal cost of ${traversalCostUnits} exceeds somatic energy budget of ${allowedBudgetUnits}`,
    })
}
