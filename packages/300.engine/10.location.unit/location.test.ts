import { describe, it, expect, beforeEach } from 'vitest'
import { LocationModel } from './location.model.js'
import {
    initLocation,
    bindSpatialPortAction,
    evaluateSpatialPathAction,
    evaluateSpatialPerceptionAction,
} from './buz/location.buzz.js'
import type {
    SpatialPort,
    TopologyManifest,
    PathReceipt,
    PerceptCandidate,
    DisplacementResult,
} from './fce/spatial-port.interface.js'
import type { SpatialOverlaySnapshot } from './fce/spatial-overlay.interface.js'

describe('10.location.unit - Synchronous SpatialPort Client Package Binding Battery', () => {
    let model: LocationModel

    const mockTopology: TopologyManifest = {
        topologyHash:
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        bounds: { minQ: -10, maxQ: 10, minR: -10, maxR: 10 },
        blockedCells: new Set<number>(),
        portalEdges: new Map(),
        cellAcousticDampingCdB: new Map(),
        ambientNoiseFloorCdB: 3000,
    }

    const mockOverlay: SpatialOverlaySnapshot = {
        overlayHash:
            'f4c2e11898fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999',
        closedPortals: Object.freeze(['hatch_01']),
        impassableCells: Object.freeze([]),
    }

    const createMockSpatialPort = (version = '1.0.0'): SpatialPort => ({
        kernelVersion: version,
        findPath: (
            topology,
            overlay,
            origin,
            destination,
            _maxBudgetCostUnits,
            _workEnvelopeLimit,
        ): PathReceipt => {
            return {
                schemaVersion: 1,
                kernelVersion: version,
                topologyHash: topology.topologyHash,
                overlayHash: overlay.overlayHash,
                queryHash: 'q_path_123',
                receiptHash: 'r_path_456',
                ok: true,
                origin,
                destination,
                path: Object.freeze([origin, destination]),
                totalCostUnits: 150,
                cellsExpanded: 4,
            }
        },
        evaluatePerception: (
            topology,
            overlay,
            sourceCell,
            observerCell,
            emissionEnergyCdB,
        ): PerceptCandidate => {
            return {
                schemaVersion: 1,
                kernelVersion: version,
                topologyHash: topology.topologyHash,
                overlayHash: overlay.overlayHash,
                queryHash: 'q_perc_123',
                receiptHash: 'r_perc_456',
                channel: 'VISUAL',
                sourceCell,
                observerCell,
                signalCdB: emissionEnergyCdB,
                ambientNoiseCdB: topology.ambientNoiseFloorCdB,
                snrMarginCdB: emissionEnergyCdB - topology.ambientNoiseFloorCdB,
                bearingDegrees: 60,
                isOccluded: false,
            }
        },
        resolveDisplacement: (): DisplacementResult => {
            throw new Error('Not implemented')
        },
    })

    beforeEach(async () => {
        model = new LocationModel()
        await initLocation(model)
    })

    it('fails closed when evaluating path without a bound SpatialPort', () => {
        let response: any
        evaluateSpatialPathAction(model, {
            idx: 'test-unbound',
            dat: {
                topologyManifest: mockTopology,
                overlaySnapshot: mockOverlay,
                originPacked: 100,
                destinationPacked: 200,
            },
            slv: (res) => {
                response = res.locBit.dat
            },
        })

        expect(response).toBeDefined()
        expect(response.error).toContain('SPATIAL_UNAVAILABLE')
    })

    it('binds SpatialPort synchronously and verifies kernel version', () => {
        const port = createMockSpatialPort('4.2.0')
        let response: any

        bindSpatialPortAction(model, {
            idx: 'bind-port',
            dat: { spatialPort: port, topologyManifest: mockTopology },
            slv: (res) => {
                response = res.locBit
            },
        })

        expect(response.idx).toBe('bind-spatial-port-success')
        expect(response.src).toBe('4.2.0')
        expect(model.spatialPort).toBe(port)
        expect(model.topologyManifest).toBe(mockTopology)
    })

    it('executes findPath synchronously within host V8 isolate (zero Promises)', () => {
        const port = createMockSpatialPort('4.2.0')
        bindSpatialPortAction(model, {
            idx: 'bind-port',
            dat: { spatialPort: port, topologyManifest: mockTopology },
        })

        let pathResult: any
        const actionReturn = evaluateSpatialPathAction(model, {
            idx: 'eval-path',
            dat: {
                overlaySnapshot: mockOverlay,
                originPacked: 101,
                destinationPacked: 102,
                maxBudgetCostUnits: 500,
            },
            slv: (res) => {
                pathResult = res.locBit.dat?.pathReceipt
            },
        })

        // Purity assertion: must not be a Promise
        expect(actionReturn).not.toBeInstanceOf(Promise)
        expect(pathResult).toBeDefined()
        expect(pathResult.ok).toBe(true)
        expect(pathResult.totalCostUnits).toBe(150)
        expect(pathResult.kernelVersion).toBe('4.2.0')
    })

    it('executes evaluatePerception synchronously and computes exact SNR margin', () => {
        const port = createMockSpatialPort('4.2.0')
        bindSpatialPortAction(model, {
            idx: 'bind-port',
            dat: { spatialPort: port, topologyManifest: mockTopology },
        })

        let perceptResult: any
        const actionReturn = evaluateSpatialPerceptionAction(model, {
            idx: 'eval-perc',
            dat: {
                overlaySnapshot: mockOverlay,
                sourceCellPacked: 101,
                observerCellPacked: 105,
                emissionEnergyCdB: 7500,
            },
            slv: (res) => {
                perceptResult = res.locBit.dat?.perceptCandidate
            },
        })

        expect(actionReturn).not.toBeInstanceOf(Promise)
        expect(perceptResult).toBeDefined()
        expect(perceptResult.channel).toBe('VISUAL')
        expect(perceptResult.signalCdB).toBe(7500)
        expect(perceptResult.snrMarginCdB).toBe(4500) // 7500 - 3000
        expect(perceptResult.isOccluded).toBe(false)
    })
})
