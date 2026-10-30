export type SimTime = number & { readonly __brand: unique symbol }

export function toSimTime(value: number): SimTime {
    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(
            `SimTime must be a non-negative integer. Received: ${value}`,
        )
    }
    return value as SimTime
}

export const CENTISECONDS_PER_SECOND = 100

export interface TickActorState {
    readonly id: string
    readonly somatic_strain_bp: number // [0, 10000]
    readonly paranoia_bp: number // [0, 10000]
    readonly current_loc: string
    readonly busyUntil: SimTime
}

export interface PendingAction {
    readonly actor_id: string
    readonly verb: string
    readonly target?: string
}

export interface TickStatePayload {
    readonly tick: SimTime
    readonly actors: readonly TickActorState[]
    readonly pending_actions: readonly PendingAction[]
}

export default interface Tick {
    // idx:string;
    // tickBitList: TickBit[];
    // tickBits:any;
}
