export type DeepReadonly<T> = T extends (infer R)[]
    ? ReadonlyArray<DeepReadonly<R>>
    : T extends Function
      ? T
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T

export function deepFreezePayload<T>(
    obj: T,
    visited = new WeakSet<object>(),
): DeepReadonly<T> {
    if (obj === null || typeof obj !== 'object') {
        return obj as DeepReadonly<T>
    }

    if (visited.has(obj as object)) {
        return Object.freeze(obj) as DeepReadonly<T>
    }

    visited.add(obj as object)

    const propNames = Object.getOwnPropertyNames(obj)
    for (const name of propNames) {
        const val = (obj as any)[name]
        if (
            val !== null &&
            (typeof val === 'object' || typeof val === 'function')
        ) {
            deepFreezePayload(val, visited)
        }
    }

    return Object.freeze(obj) as DeepReadonly<T>
}
