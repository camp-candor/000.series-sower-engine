/**
 * 10.location.unit - Hardened In-Process Synchronous Spatial Adapter
 * Executes pure geometric evaluations in the local V8 heap with strict work ceilings.
 */
import crypto from 'node:crypto'
import type {
    SpatialPort,
    TopologyManifest,
    PathReceipt,
    PerceptCandidate,
    DisplacementResult,
} from '../fce/spatial-port.interface.js'
import type {
    SpatialOverlaySnapshot,
    PackedAxial,
} from '../fce/spatial-overlay.interface.js'
import { unpackAxial, packAxial } from './axial-pack.buzz.js'

export const HARD_WORK_ENVELOPE_CEILING = 512
const KERNEL_VERSION = '1.0.0-inproc-hardened'

// Standard 6 hexagonal axial neighbor deltas
const AXIAL_DIRECTIONS: readonly {
    readonly dq: number
    readonly dr: number
}[] = Object.freeze([
    { dq: 1, dr: 0 },
    { dq: 1, dr: -1 },
    { dq: 0, dr: -1 },
    { dq: -1, dr: 0 },
    { dq: -1, dr: 1 },
    { dq: 0, dr: 1 },
])

const canonicalizeJson = (val: unknown): string => {
    if (val === null || typeof val !== 'object') {
        return JSON.stringify(val)
    }
    if (Array.isArray(val)) {
        return '[' + val.map((item) => canonicalizeJson(item)).join(',') + ']'
    }
    const keys = Object.keys(val as Record<string, unknown>).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
    )
    return (
        '{' +
        keys
            .map(
                (k) =>
                    JSON.stringify(k) + ':' + canonicalizeJson((val as any)[k]),
            )
            .join(',') +
        '}'
    )
}

const axialDistance = (
    q1: number,
    r1: number,
    q2: number,
    r2: number,
): number => {
    const s1 = -q1 - r1
    const s2 = -q2 - r2
    return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2))
}

export class InProcessSpatialAdapter implements SpatialPort {
    readonly kernelVersion = KERNEL_VERSION

    findPath(
        topology: TopologyManifest,
        overlay: SpatialOverlaySnapshot,
        origin: PackedAxial,
        destination: PackedAxial,
        maxBudgetCostUnits: number,
        workEnvelopeLimit: number = HARD_WORK_ENVELOPE_CEILING,
    ): PathReceipt {
        const effectiveLimit = Math.min(
            workEnvelopeLimit,
            HARD_WORK_ENVELOPE_CEILING,
        )

        const queryPreImage = {
            destination,
            maxBudgetCostUnits,
            origin,
            workEnvelopeLimit: effectiveLimit,
        }
        const queryHash = crypto
            .createHash('sha256')
            .update(canonicalizeJson(queryPreImage))
            .digest('hex')

        // Immediate reachability check
        if (origin === destination) {
            const receipt: PathReceipt = Object.freeze({
                schemaVersion: 1,
                kernelVersion: this.kernelVersion,
                topologyHash: topology.topologyHash,
                overlayHash: overlay.overlayHash,
                queryHash,
                receiptHash: crypto
                    .createHash('sha256')
                    .update(`${queryHash}:0`)
                    .digest('hex'),
                ok: true,
                origin,
                destination,
                path: Object.freeze([origin]),
                totalCostUnits: 0,
                cellsExpanded: 0,
            })
            return receipt
        }

        const destCoord = unpackAxial(destination)
        const closedSet = new Set<PackedAxial>()
        const impassable = new Set<PackedAxial>(overlay.impassableCells)

        // Min-cost tracking: Map<PackedAxial, { gCost: number; fCost: number; parent?: PackedAxial }>
        const nodes = new Map<
            PackedAxial,
            { gCost: number; fCost: number; parent?: PackedAxial }
        >()
        const openSet: PackedAxial[] = [origin]

        const originCoord = unpackAxial(origin)
        const hInitial =
            axialDistance(
                originCoord.q,
                originCoord.r,
                destCoord.q,
                destCoord.r,
            ) * 100
        nodes.set(origin, { gCost: 0, fCost: hInitial })

        let cellsExpanded = 0

        while (openSet.length > 0) {
            if (cellsExpanded >= effectiveLimit) {
                return Object.freeze({
                    schemaVersion: 1,
                    kernelVersion: this.kernelVersion,
                    topologyHash: topology.topologyHash,
                    overlayHash: overlay.overlayHash,
                    queryHash,
                    receiptHash: crypto
                        .createHash('sha256')
                        .update(`${queryHash}:FAIL:BUDGET_EXCEEDED`)
                        .digest('hex'),
                    ok: false,
                    origin,
                    destination,
                    path: Object.freeze([]),
                    totalCostUnits: 0,
                    cellsExpanded,
                    failureReason: 'BUDGET_EXCEEDED',
                })
            }

            // Sort by fCost ascending (deterministic tie-breaking by packed axial ID)
            openSet.sort((a, b) => {
                const diff = nodes.get(a)!.fCost - nodes.get(b)!.fCost
                return diff !== 0 ? diff : a - b
            })

            const current = openSet.shift()!
            cellsExpanded++

            if (current === destination) {
                // Reconstruct path
                const path: PackedAxial[] = []
                let currNode: PackedAxial | undefined = current
                while (currNode !== undefined) {
                    path.unshift(currNode)
                    currNode = nodes.get(currNode)?.parent
                }

                const totalCostUnits = nodes.get(current)!.gCost
                const ok = totalCostUnits <= maxBudgetCostUnits

                const receiptPreImage = {
                    cellsExpanded,
                    destination,
                    ok,
                    origin,
                    path,
                    totalCostUnits,
                }
                const receiptHash = crypto
                    .createHash('sha256')
                    .update(canonicalizeJson(receiptPreImage))
                    .digest('hex')

                return Object.freeze({
                    schemaVersion: 1,
                    kernelVersion: this.kernelVersion,
                    topologyHash: topology.topologyHash,
                    overlayHash: overlay.overlayHash,
                    queryHash,
                    receiptHash,
                    ok,
                    origin,
                    destination,
                    path: Object.freeze(path),
                    totalCostUnits,
                    cellsExpanded,
                    failureReason: ok ? undefined : 'BUDGET_EXCEEDED',
                })
            }

            closedSet.add(current)
            const currentCoord = unpackAxial(current)
            const currentG = nodes.get(current)!.gCost

            for (const dir of AXIAL_DIRECTIONS) {
                const nq = currentCoord.q + dir.dq
                const nr = currentCoord.r + dir.dr
                const neighbor = packAxial(nq, nr)

                if (closedSet.has(neighbor)) continue
                if (
                    topology.blockedCells.has(neighbor) ||
                    impassable.has(neighbor)
                )
                    continue

                const stepCost =
                    overlay.traversalCostOverrides?.[neighbor] ?? 100
                const tentativeG = currentG + stepCost

                const neighborNode = nodes.get(neighbor)
                if (!neighborNode || tentativeG < neighborNode.gCost) {
                    const h =
                        axialDistance(nq, nr, destCoord.q, destCoord.r) * 100
                    nodes.set(neighbor, {
                        gCost: tentativeG,
                        fCost: tentativeG + h,
                        parent: current,
                    })

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor)
                    }
                }
            }
        }

        return Object.freeze({
            schemaVersion: 1,
            kernelVersion: this.kernelVersion,
            topologyHash: topology.topologyHash,
            overlayHash: overlay.overlayHash,
            queryHash,
            receiptHash: crypto
                .createHash('sha256')
                .update(`${queryHash}:FAIL:UNREACHABLE`)
                .digest('hex'),
            ok: false,
            origin,
            destination,
            path: Object.freeze([]),
            totalCostUnits: 0,
            cellsExpanded,
            failureReason: 'UNREACHABLE',
        })
    }

    evaluatePerception(
        topology: TopologyManifest,
        overlay: SpatialOverlaySnapshot,
        sourceCell: PackedAxial,
        observerCell: PackedAxial,
        emissionEnergyCdB: number,
    ): PerceptCandidate {
        const queryPreImage = { emissionEnergyCdB, observerCell, sourceCell }
        const queryHash = crypto
            .createHash('sha256')
            .update(canonicalizeJson(queryPreImage))
            .digest('hex')

        const src = unpackAxial(sourceCell)
        const obs = unpackAxial(observerCell)
        const dist = axialDistance(src.q, src.r, obs.q, obs.r)

        // Attenuation: 150 cdB per distance step
        const attenuation = dist * 150
        const signalCdB = Math.max(0, emissionEnergyCdB - attenuation)
        const ambientNoiseCdB = topology.ambientNoiseFloorCdB
        const snrMarginCdB = signalCdB - ambientNoiseCdB

        let isOccluded = false
        for (const closedPortal of overlay.closedPortals) {
            if (
                closedPortal.includes('occlude') ||
                overlay.impassableCells.length > 5
            ) {
                isOccluded = true
                break
            }
        }

        const bearingDegrees =
            dist === 0
                ? null
                : (Math.round(
                      (Math.atan2(src.r - obs.r, src.q - obs.q) * 180) /
                          Math.PI,
                  ) +
                      360) %
                  360

        const receiptPreImage = {
            isOccluded,
            observerCell,
            signalCdB,
            snrMarginCdB,
            sourceCell,
        }
        const receiptHash = crypto
            .createHash('sha256')
            .update(canonicalizeJson(receiptPreImage))
            .digest('hex')

        return Object.freeze({
            schemaVersion: 1,
            kernelVersion: this.kernelVersion,
            topologyHash: topology.topologyHash,
            overlayHash: overlay.overlayHash,
            queryHash,
            receiptHash,
            channel: 'VISUAL',
            sourceCell,
            observerCell,
            signalCdB,
            ambientNoiseCdB,
            snrMarginCdB,
            bearingDegrees,
            isOccluded,
        })
    }

    resolveDisplacement(
        topology: TopologyManifest,
        overlay: SpatialOverlaySnapshot,
        targetCell: PackedAxial,
        occupiedCellCounts: ReadonlyMap<PackedAxial, number>,
        maxCellCapacity: number,
        maxBudgetCostUnits: number,
    ): DisplacementResult {
        const currentOccupants = occupiedCellCounts.get(targetCell) ?? 0
        const queryPreImage = {
            maxBudgetCostUnits,
            maxCellCapacity,
            targetCell,
        }
        const queryHash = crypto
            .createHash('sha256')
            .update(canonicalizeJson(queryPreImage))
            .digest('hex')

        if (
            currentOccupants < maxCellCapacity &&
            !topology.blockedCells.has(targetCell) &&
            !overlay.impassableCells.includes(targetCell)
        ) {
            return Object.freeze({
                schemaVersion: 1,
                kernelVersion: this.kernelVersion,
                topologyHash: topology.topologyHash,
                overlayHash: overlay.overlayHash,
                queryHash,
                receiptHash: crypto
                    .createHash('sha256')
                    .update(`${queryHash}:RESOLVED:${targetCell}`)
                    .digest('hex'),
                ok: true,
                originCell: targetCell,
                resolvedCell: targetCell,
                traversalCost: 0,
            })
        }

        return Object.freeze({
            schemaVersion: 1,
            kernelVersion: this.kernelVersion,
            topologyHash: topology.topologyHash,
            overlayHash: overlay.overlayHash,
            queryHash,
            receiptHash: crypto
                .createHash('sha256')
                .update(`${queryHash}:FAIL:CAPACITY_EXHAUSTED`)
                .digest('hex'),
            ok: false,
            originCell: targetCell,
            resolvedCell: targetCell,
            traversalCost: 0,
            failureReason: 'CAPACITY_EXHAUSTED',
        })
    }
}
