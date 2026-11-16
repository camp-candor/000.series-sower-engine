/**
 * 00.engine.unit - Authoritative Engine Reset Artifact Manifest
 * Pure deterministic registry of all purgeable runtime spools, protected paths,
 * 10 relational ledger tables, and all 26 BEE units mounted in packages/300.engine/BEE.ts.
 */

import type {
    EngineResetManifest,
    EngineUnitResetDescriptor,
    ResetArtifactTargetDescriptor,
} from '../fce/reset-manifest.interface.js'

export const ENGINE_GENESIS_HASH_64 = '0'.repeat(64)

export const ENGINE_PURGEABLE_TARGETS: readonly ResetArtifactTargetDescriptor[] =
    Object.freeze([
        Object.freeze({
            id: 'compiled_universes',
            relativePath: 'compiled',
            durabilityClass: 'COMPILED_PROJECTION',
            preserveRootDirectory: true,
            description:
                'Ingested bible-state.json universe directories compiled from 000.goblin-lore',
        }),
        Object.freeze({
            id: 'fountain_drafts',
            relativePath: 'drafts',
            durabilityClass: 'TRANSIENT_SPOOL',
            preserveRootDirectory: true,
            description:
                'Staged .fountain screenplays, active_scene.fountain, dialogue_ast.json, and auto-script spools',
        }),
        Object.freeze({
            id: 'conductor_export_spool',
            relativePath: 'conductor_export',
            durabilityClass: 'TRANSIENT_SPOOL',
            preserveRootDirectory: false,
            description:
                'Fallback cross-repo export staging spool for 000.series-sower-conductor handoff',
        }),
        Object.freeze({
            id: 'local_sqlite_databases',
            relativePath: 'data/sqlite',
            durabilityClass: 'LOCAL_DATABASE',
            preserveRootDirectory: true,
            description:
                'Local SQLite realm database files (*.local.db, *.local.db-wal, *.local.db-shm)',
        }),
    ])

export const ENGINE_PROTECTED_PATH_PREFIXES: readonly string[] = Object.freeze([
    '.git',
    '.github',
    '.husky',
    '.env',
    '.dev.vars',
    'node_modules',
    'apps/995.library',
    'apps/worker',
    'packages',
    'scripts',
    'bin',
    'data/overview',
    'data/building',
    'data/directive',
])

export const ENGINE_RELATIONAL_TABLES: readonly string[] = Object.freeze([
    'event_log',
    'entities_live',
    'strings_ledger',
    'grievance_status',
    'paranoia_clocks',
    'actor_beliefs',
    'unratified_details',
    'facts',
    'scenes',
    'scene_fact_dependencies',
])

export const ENGINE_UNIT_RESET_REGISTRY: readonly EngineUnitResetDescriptor[] =
    Object.freeze([
        Object.freeze({
            unitFolder: '00.engine.unit',
            sliceKey: 'engine',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Engine action] Reset Engine',
            notes: 'Restores boot posture to OFFLINE and state hash to GENESIS_HASH_64',
        }),
        Object.freeze({
            unitFolder: '01.actor.unit',
            sliceKey: 'actor',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Actor action] Reset Actor',
            notes: 'Clears epistemic belief horizons, salience queues, and compiled beat ASTs',
        }),
        Object.freeze({
            unitFolder: '02.database.unit',
            sliceKey: 'database',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Database action] Reset Local Database',
            notes: 'Clears all 10 relational ledger tables and closes realm handles',
        }),
        Object.freeze({
            unitFolder: '03.entity.unit',
            sliceKey: 'entity',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Entity action] Reset Entity',
            notes: 'Flushes live composite entity state and somatic capacity caches',
        }),
        Object.freeze({
            unitFolder: '04.envelope.unit',
            sliceKey: 'envelope',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Envelope action] Reset Envelope',
            notes: 'Resets event envelope chain validation caches',
        }),
        Object.freeze({
            unitFolder: '05.event.unit',
            sliceKey: 'event',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Event action] Reset Event',
            notes: 'Resets pacing budget state and drought counters',
        }),
        Object.freeze({
            unitFolder: '06.grievance.unit',
            sliceKey: 'grievance',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Grievance action] Reset Grievance',
            notes: 'Clears Stage 3 encounter lottery history and cooldown state',
        }),
        Object.freeze({
            unitFolder: '07.inventory.unit',
            sliceKey: 'inventory',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Inventory action] Reset Inventory',
            notes: 'Clears possession transfer caches',
        }),
        Object.freeze({
            unitFolder: '08.ledger.unit',
            sliceKey: 'ledger',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Ledger action] Reset Ledger',
            notes: 'Clears volatile staging accumulators and Stage 4 duel receipts',
        }),
        Object.freeze({
            unitFolder: '09.leverage.unit',
            sliceKey: 'leverage',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Leverage action] Reset Leverage',
            notes: 'Clears social debt String solvency caches',
        }),
        Object.freeze({
            unitFolder: '10.location.unit',
            sliceKey: 'location',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Location action] Reset Location',
            notes: 'Unloads cached topology manifests and spatial overlay snapshots',
        }),
        Object.freeze({
            unitFolder: '11.belief.unit',
            sliceKey: 'belief',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Belief action] Reset Belief',
            notes: 'Clears sensory percept filter caches',
        }),
        Object.freeze({
            unitFolder: '11.movement.unit',
            sliceKey: 'movement',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Movement action] Reset Movement',
            notes: 'Clears actor axial coordinate maps',
        }),
        Object.freeze({
            unitFolder: '12.paranoia.unit',
            sliceKey: 'paranoia',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Paranoia action] Reset Paranoia',
            notes: 'Resets thermodynamic pressure clocks and tripwire phases',
        }),
        Object.freeze({
            unitFolder: '13.primordial.unit',
            sliceKey: 'primordial',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Primordial action] Reset Primordial',
            notes: 'Resets genesisSeeded to false and hRoot to GENESIS_HASH_64',
        }),
        Object.freeze({
            unitFolder: '14.sequence.unit',
            sliceKey: 'sequence',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Sequence action] Reset Sequence',
            notes: 'Restores monotonic sequence head and OCC locks to 0',
        }),
        Object.freeze({
            unitFolder: '15.series.unit',
            sliceKey: 'series',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Series action] Reset Series',
            notes: 'Clears activeSeriesSlug and storage namespace allocations',
        }),
        Object.freeze({
            unitFolder: '16.state.unit',
            sliceKey: 'state',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[State action] Reset State',
            notes: 'Clears deep-frozen snapshot folds and why-dirty traces',
        }),
        Object.freeze({
            unitFolder: '17.tick.unit',
            sliceKey: 'tick',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Tick action] Reset Tick',
            notes: 'Restores simulation logical clock to Tick 0',
        }),
        Object.freeze({
            unitFolder: '18.trauma.unit',
            sliceKey: 'trauma',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Trauma action] Reset Trauma',
            notes: 'Clears somatic trauma vectors and locomotion tier overrides',
        }),
        Object.freeze({
            unitFolder: '19.wounds.unit',
            sliceKey: 'wounds',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Wounds action] Reset Wounds',
            notes: 'Clears active wound decay timers',
        }),
        Object.freeze({
            unitFolder: '20.arithmetic.unit',
            sliceKey: 'arithmetic',
            classification: 'STATELESS_PURE',
            notes: 'Pure deterministic Banker rounding and BigInt basis-point math',
        }),
        Object.freeze({
            unitFolder: '21.compile.unit',
            sliceKey: 'compile',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Compile action] Reset Compile',
            notes: 'Clears cached compilation validation reports and gate receipts',
        }),
        Object.freeze({
            unitFolder: '97.collect.unit',
            sliceKey: 'collect',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Collect action] Reset Collect',
            notes: 'Clears caboodleBitList and caboodleBits registries',
        }),
        Object.freeze({
            unitFolder: '98.menu.unit',
            sliceKey: 'menu',
            classification: 'STATEFUL_RESETTABLE',
            resetActionType: '[Menu action] Reset Tabula Rasa Menu',
            notes: 'Clears discoveredUniverses, activeSeriesSlug, and lastStagedFountainPath',
        }),
        Object.freeze({
            unitFolder: '99.bus.unit',
            sliceKey: 'bus',
            classification: 'STATELESS_PURE',
            notes: 'Internal Rx-Lite and MQTT dispatch bus infrastructure',
        }),
    ])

export const ENGINE_RESET_MANIFEST: EngineResetManifest = Object.freeze({
    schemaVersion: '1.0.0',
    repository: '000.series-sower-engine',
    packageId: '300.engine',
    genesisHashHex: ENGINE_GENESIS_HASH_64,
    purgeableTargets: ENGINE_PURGEABLE_TARGETS,
    protectedPathPrefixes: ENGINE_PROTECTED_PATH_PREFIXES,
    relationalTables: ENGINE_RELATIONAL_TABLES,
    unitRegistry: ENGINE_UNIT_RESET_REGISTRY,
})

export function validateEngineResetManifest(
    manifest: EngineResetManifest = ENGINE_RESET_MANIFEST,
): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!manifest || manifest.repository !== '000.series-sower-engine') {
        errors.push('Manifest repository must equal 000.series-sower-engine')
    }

    if (!/^[0]{64}$/.test(manifest.genesisHashHex)) {
        errors.push('genesisHashHex must be 64 zero characters')
    }

    if (manifest.purgeableTargets.length === 0) {
        errors.push(
            'purgeableTargets must declare at least one runtime directory',
        )
    }

    for (const target of manifest.purgeableTargets) {
        const norm = target.relativePath
            .replace(/\\/g, '/')
            .replace(/^\/+|\/+$/g, '')
        if (!norm || norm.includes('..')) {
            errors.push(`Invalid purgeable target path: ${target.relativePath}`)
        }
        for (const protectedPrefix of manifest.protectedPathPrefixes) {
            if (
                norm === protectedPrefix ||
                norm.startsWith(`${protectedPrefix}/`)
            ) {
                errors.push(
                    `Purgeable target '${norm}' collides with protected prefix '${protectedPrefix}'`,
                )
            }
        }
    }

    if (manifest.relationalTables.length !== 10) {
        errors.push(
            `Expected 10 relational tables in manifest, found ${manifest.relationalTables.length}`,
        )
    }

    const seenUnits = new Set<string>()
    for (const unit of manifest.unitRegistry) {
        if (seenUnits.has(unit.unitFolder)) {
            errors.push(`Duplicate unit entry in registry: ${unit.unitFolder}`)
        }
        seenUnits.add(unit.unitFolder)

        if (
            unit.classification === 'STATEFUL_RESETTABLE' &&
            (!unit.resetActionType || unit.resetActionType.trim().length === 0)
        ) {
            errors.push(
                `Stateful unit '${unit.unitFolder}' missing resetActionType`,
            )
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

export function classifyEngineUnitReset(
    unitFolder: string,
    manifest: EngineResetManifest = ENGINE_RESET_MANIFEST,
): EngineUnitResetDescriptor | undefined {
    return manifest.unitRegistry.find((u) => u.unitFolder === unitFolder)
}
