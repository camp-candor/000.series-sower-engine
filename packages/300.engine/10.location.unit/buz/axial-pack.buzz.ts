/**
 * 10.location.unit - Integer Axial Coordinate Packing Transformer
 * Exact 32-bit unsigned integer packing adhering to Gillian Arithmetic Doctrine.
 */
import type {
    AxialCoord,
    PackedAxial,
} from '../fce/spatial-overlay.interface.js'

const AXIAL_OFFSET = 32768 // 16-bit signed range [-32768, 32767]

export const packAxial = (q: number, r: number): PackedAxial => {
    if (!Number.isInteger(q) || !Number.isInteger(r)) {
        throw new Error(
            `[AXIAL_PACK_ERROR] Coordinates must be discrete integers: q=${q}, r=${r}`,
        )
    }

    const qShifted = (q + AXIAL_OFFSET) & 0xffff
    const rShifted = (r + AXIAL_OFFSET) & 0xffff

    return ((qShifted << 16) | rShifted) >>> 0
}

export const unpackAxial = (packed: PackedAxial): AxialCoord => {
    if (!Number.isInteger(packed) || packed < 0 || packed > 0xffffffff) {
        throw new Error(
            `[AXIAL_UNPACK_ERROR] Invalid unsigned 32-bit packed coordinate: ${packed}`,
        )
    }

    const qShifted = (packed >>> 16) & 0xffff
    const rShifted = packed & 0xffff

    const q = qShifted - AXIAL_OFFSET
    const r = rShifted - AXIAL_OFFSET
    const s = -q - r // Cubic planar zero-sum invariant: q + r + s === 0

    return Object.freeze({ q, r, s })
}
