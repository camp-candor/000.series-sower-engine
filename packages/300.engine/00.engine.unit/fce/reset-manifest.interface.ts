/**
 * 00.engine.unit - Declarative Reset Artifact Manifest Contracts
 * Pure zero-IO structural contracts governing Void-State reversibility.
 */

export type ResetArtifactDurabilityClass =
    | 'COMPILED_PROJECTION'
    | 'TRANSIENT_SPOOL'
    | 'LOCAL_DATABASE'

export type EngineUnitResetClassification =
    | 'STATEFUL_RESETTABLE'
    | 'STATELESS_PURE'

export interface ResetArtifactTargetDescriptor {
    readonly id: string
    readonly relativePath: string
    readonly durabilityClass: ResetArtifactDurabilityClass
    readonly preserveRootDirectory: boolean
    readonly description: string
}

export interface EngineUnitResetDescriptor {
    readonly unitFolder: string
    readonly sliceKey: string
    readonly classification: EngineUnitResetClassification
    readonly resetActionType?: string
    readonly notes: string
}

export interface EngineResetManifest {
    readonly schemaVersion: string
    readonly repository: '000.series-sower-engine'
    readonly packageId: '300.engine'
    readonly genesisHashHex: string
    readonly purgeableTargets: readonly ResetArtifactTargetDescriptor[]
    readonly protectedPathPrefixes: readonly string[]
    readonly relationalTables: readonly string[]
    readonly unitRegistry: readonly EngineUnitResetDescriptor[]
}
