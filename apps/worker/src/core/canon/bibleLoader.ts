import { BibleState, BibleStateSchema } from './types.js'

export class CanonValidationError extends Error {
    constructor(message: string) {
        super(`[CANON_VALIDATION_ERROR] ${message}`)
        this.name = 'CanonValidationError'
    }
}

export class CanonDesynchronizedError extends Error {
    constructor(message: string) {
        super(`[CANON_STALE] DESYNCHRONIZED ENGINE WARNING: ${message}`)
        this.name = 'CanonDesynchronizedError'
    }
}

/**
 * Recursively freezes an object and its descendants in memory.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }
    Object.freeze(obj)
    for (const key of Object.getOwnPropertyNames(obj)) {
        const val = (obj as any)[key]
        if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
            deepFreeze(val)
        }
    }
    return obj as Readonly<T>
}

/**
 * Two-Color / Three-Color DFS cycle detector across Grievance escalation DAGs.
 */
function verifyGrievanceAcyclicity(
    grievances: Record<string, { id: string; escalatesToId: string | null }>,
): void {
    const enum VisitState {
        WHITE = 0, // Unvisited
        GREY = 1, // Currently in recursion stack
        BLACK = 2, // Fully evaluated
    }

    const visited = new Map<string, VisitState>()
    for (const id of Object.keys(grievances)) {
        visited.set(id, VisitState.WHITE)
    }

    function dfs(currentId: string, path: string[]): void {
        visited.set(currentId, VisitState.GREY)
        path.push(currentId)

        const node = grievances[currentId]
        if (node && node.escalatesToId) {
            const nextId = node.escalatesToId
            if (!grievances[nextId]) {
                throw new CanonValidationError(
                    `Dangling grievance escalation pointer: ${currentId} -> ${nextId}`,
                )
            }
            const nextState = visited.get(nextId)
            if (nextState === VisitState.GREY) {
                throw new CanonValidationError(
                    `CYCLIC_GRIEVANCE_DETECTED: Cycle found in path: ${[...path, nextId].join(' -> ')}`,
                )
            }
            if (nextState === VisitState.WHITE) {
                dfs(nextId, path)
            }
        }

        path.pop()
        visited.set(currentId, VisitState.BLACK)
    }

    for (const id of Object.keys(grievances)) {
        if (visited.get(id) === VisitState.WHITE) {
            dfs(id, [])
        }
    }
}

/**
 * Pass 2: Relational Topology & Foreign-Key Sweep.
 */
function verifyRelationalGraph(canon: BibleState): void {
    const charIds = new Set(Object.keys(canon.characters))
    const locIds = new Set(Object.keys(canon.locations))

    // 1. Verify item holder foreign keys
    for (const [itemId, item] of Object.entries(canon.possessions)) {
        if (item.holderId !== null && !charIds.has(item.holderId)) {
            throw new CanonValidationError(
                `Possession ${itemId} references non-existent holderId: ${item.holderId}`,
            )
        }
    }

    // 2. Verify location portal reciprocity
    for (const [locId, location] of Object.entries(canon.locations)) {
        for (const portalTarget of location.portals) {
            if (!locIds.has(portalTarget)) {
                throw new CanonValidationError(
                    `Location ${locId} references non-existent portal target: ${portalTarget}`,
                )
            }
        }
    }

    // 3. Verify grievance actors and acyclicity
    for (const [grvId, grv] of Object.entries(canon.grievances)) {
        if (!charIds.has(grv.sourceActorId)) {
            throw new CanonValidationError(
                `Grievance ${grvId} references non-existent sourceActorId: ${grv.sourceActorId}`,
            )
        }
        if (!charIds.has(grv.targetActorId)) {
            throw new CanonValidationError(
                `Grievance ${grvId} references non-existent targetActorId: ${grv.targetActorId}`,
            )
        }
    }
    verifyGrievanceAcyclicity(canon.grievances)
}

/**
 * Two-Pass Zod compiler and loader for canonical raw JSON snapshots.
 */
export function compileCanonSnapshot(
    rawPayload: unknown,
): Readonly<BibleState> {
    // Pass 1: Semantic Roughing (Zod structural validation)
    const parseResult = BibleStateSchema.safeParse(rawPayload)
    if (!parseResult.success) {
        throw new CanonValidationError(
            `Pass 1 Schema Failure: ${parseResult.error.errors.map((e) => `${e.path.join('.')}:${e.message}`).join('; ')}`,
        )
    }
    const canon = parseResult.data

    // Pass 2: Relational Topology Verification
    verifyRelationalGraph(canon)

    // Runtime defensive freeze
    return deepFreeze(canon)
}
