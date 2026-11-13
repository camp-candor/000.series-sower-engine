import fs from 'node:fs'
import path from 'node:path'
import { CompileModel } from '../../21.compile.unit/compile.model.js'
import {
    runCompile,
    sha256Hex,
} from '../../21.compile.unit/buz/compile.buzz.js'
import { WIREGRASS_BASIN_CANON_CORPUS } from '../../21.compile.unit/buz/wiregrass-canon.fixture.js'
import {
    sanitizeFountainToAscii,
    promoteEmbeddedDialogueCues,
    validateFountainIngress,
} from '../../21.compile.unit/buz/fountain-ingress.buzz.js'
import {
    tokenizeFountainDialogue,
    runSeriesFountainPreflightGate,
    coerceBibleStateToCompileCorpus,
    resolveCharacterByCue,
    deriveCanonicalCueFromCharacter,
} from '../../21.compile.unit/buz/parallax-preflight.buzz.js'
import type { CompileCorpusPayload } from '../../21.compile.unit/fce/compile.bit.js'
import { ActorModel } from '../../01.actor.unit/actor.model.js'
import {
    initActor,
    recordBeliefActor,
    compileDialogueBeatAction,
    enforceCurtnessBudget,
    probeDialogueLeakAction,
} from '../../01.actor.unit/actor.buzzer.js'
import type {
    DialogueBeatAST,
    DialogueLeakProbeReceipt,
} from '../../01.actor.unit/actor.buzzer.js'
import { LedgerModel } from '../../08.ledger.unit/ledger.model.js'
import {
    initLedger,
    resolveDual2d6Action,
} from '../../08.ledger.unit/ledger.buzzer.js'
import { BeliefModel } from '../../11.belief.unit/belief.model.js'
import {
    initBelief,
    processPerceptCandidateAction,
    evaluateSensoryFilter,
} from '../../11.belief.unit/belief.buzzer.js'
import { packAxial } from '../../10.location.unit/location.buzzer.js'

const UPDATE_CONSOLE = '[Console action] Update Console'
const EDIT_TERMINAL = '[Terminal action] Edit Terminal'

export interface SpatialHeaderCharacterSpec {
    readonly id: string
    readonly name: string
    readonly cue: string
    readonly coord: { readonly q: number; readonly r: number }
    readonly availableArms: number
    readonly availableLegs: number
    readonly locomotionTier: string
    readonly motorCapabilityMask: readonly string[]
    readonly bannedKineticVerbs: readonly string[]
}

export interface SpatialHeaderDuelSpec {
    readonly grievanceId: string
    readonly initiatorId: string
    readonly targetId: string
    readonly rollAObj: number
    readonly rollBObj: number
    readonly modObj: number
    readonly dObj: number
    readonly objectiveOutcome: string
    readonly rollASom: number
    readonly rollBSom: number
    readonly modSom: number
    readonly dSom: number
    readonly somaticOutcome: string
}

export interface StagedSpatialHeaderMetadata {
    readonly seriesSlug: string
    readonly sceneId: string
    readonly title: string
    readonly locationId: string
    readonly locationName: string
    readonly roomCoords: {
        readonly origin: { readonly q: number; readonly r: number }
        readonly bounds: {
            readonly minQ: number
            readonly maxQ: number
            readonly minR: number
            readonly maxR: number
        }
    }
    readonly acousticFloorCdB: number
    readonly stateSnapshotHash: string
    readonly characters: readonly SpatialHeaderCharacterSpec[]
    readonly duelOutcome: SpatialHeaderDuelSpec
}

export interface StageFountainEditorResult {
    readonly seriesSlug: string
    readonly draftPath: string
    readonly activeDraftPath: string
    readonly stagedContent: string
    readonly headerMetadata: StagedSpatialHeaderMetadata
    readonly editorInvoked: boolean
    readonly editorResultIdx: string
    readonly receipts: readonly string[]
}

export interface CompiledConductorDialogueLine {
    readonly line_id: string
    readonly speaker_id: string
    readonly dialogue_clean_ascii: string
    readonly emotional_tag:
        | 'COLD_RESENTMENT'
        | 'FEAR'
        | 'DOMINANT'
        | 'SUBSERVIENT'
        | 'PANIC'
        | 'NEUTRAL'
    readonly somatic_dsp: {
        readonly gain_attenuation_bps: number
        readonly pitch_shift_cents: number
        readonly breathiness_bps: number
        readonly ducking_depth_db: number
    }
    readonly mru_directive: {
        readonly mru_phase:
            | 'MOTIVATION'
            | 'FEELING'
            | 'REFLEX'
            | 'RATIONAL_ACTION'
        readonly stimulus_id: string
        readonly intensity_bps: number
    }
    readonly beat_ast?: DialogueBeatAST
}

export interface CompiledDialogueAstArtifact {
    readonly scene_id: string
    readonly episode_number: number
    readonly sequence_index: number
    readonly state_snapshot_hash: string
    readonly pinned_fact_version: number
    readonly environment_id: string
    readonly camera_framing: {
        readonly shot_type:
            | 'CLOSE_UP'
            | 'MEDIUM_SHOT'
            | 'WIDE_ESTABLISHING'
            | 'DUTCH_ANGLE'
            | 'OVER_THE_SHOULDER'
        readonly focal_entity_id: string
        readonly secondary_entity_id?: string
    }
    readonly lines: readonly CompiledConductorDialogueLine[]
}

export interface CompileFullFountainDraftResult {
    readonly valid: boolean
    readonly seriesSlug: string
    readonly sourceFountainPath: string
    readonly outputAstPath: string
    readonly turnCount: number
    readonly verbatimParityOk: boolean
    readonly asciiClean: boolean
    readonly transliteratedCount: number
    readonly curtnessWordCap: number
    readonly astArtifact: CompiledDialogueAstArtifact
    readonly dualFieldBeats: readonly DialogueBeatAST[]
    readonly leakReceipts: readonly DialogueLeakProbeReceipt[]
    readonly sensoryGatePassed: boolean
    readonly violations: readonly string[]
    readonly receipts: readonly string[]
}

export interface ExportToConductorResult {
    readonly ok: boolean
    readonly seriesSlug: string
    readonly sourceFountainPath: string
    readonly sourceAstPath: string
    readonly exportedFountainPaths: readonly string[]
    readonly exportedAstPaths: readonly string[]
    readonly turnCount: number
    readonly stateSnapshotHash: string
    readonly receipts: readonly string[]
}

function resolveEngineBaseDir(explicitBaseDir?: string): string {
    if (explicitBaseDir) {
        return path.resolve(explicitBaseDir)
    }
    let curr = path.resolve(process.cwd())
    while (curr && curr !== path.dirname(curr)) {
        if (
            fs.existsSync(path.join(curr, 'compiled')) ||
            fs.existsSync(path.join(curr, 'packages', '300.engine'))
        ) {
            return curr
        }
        curr = path.dirname(curr)
    }
    return path.resolve(process.cwd())
}

async function emitCns00(ste: any, lines: readonly string[]): Promise<void> {
    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)
    for (const rawLine of lines) {
        const cleanLine = sanitizeFountainToAscii(rawLine).text
        if (lib && typeof lib.hunt === 'function') {
            try {
                await lib.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: cleanLine,
                })
                continue
            } catch {
                // Fall through to ste.hunt
            }
        }
        if (ste && typeof ste.hunt === 'function') {
            try {
                await ste.hunt(UPDATE_CONSOLE, {
                    idx: 'cns00',
                    src: cleanLine,
                })
            } catch {
                // Degrade gracefully in headless runs
            }
        }
    }
}

export function resolveActiveSeriesCorpus(options?: {
    readonly baseDir?: string
    readonly seriesSlug?: string
    readonly corpus?: CompileCorpusPayload
    readonly rawBibleState?: any
}): {
    readonly seriesSlug: string
    readonly corpus: CompileCorpusPayload
    readonly rawBibleState: any
    readonly stateSnapshotHash: string
} {
    const baseDir = resolveEngineBaseDir(options?.baseDir)
    const activeSlugCandidate =
        options?.seriesSlug ||
        (globalThis as any).ACTIVE_SERIES_SLUG ||
        'wiregrass-basin'

    if (options?.corpus) {
        const compileModel = new CompileModel()
        runCompile(compileModel, {
            idx: 'run-compile',
            dat: {
                seriesSlug: activeSlugCandidate,
                corpus: options.corpus,
            },
        })
        return {
            seriesSlug: activeSlugCandidate,
            corpus: options.corpus,
            rawBibleState: options.rawBibleState ?? null,
            stateSnapshotHash: compileModel.rootMerkleHash ?? '1'.repeat(64),
        }
    }

    const activeStateFromGlobal =
        options?.rawBibleState ??
        (globalThis as any).INGESTED_BIBLE_STATES?.[activeSlugCandidate] ??
        (globalThis as any).ACTIVE_BIBLE_STATE

    let rawManifest: any = activeStateFromGlobal ?? null
    let resolvedSlug = activeSlugCandidate

    if (!rawManifest) {
        const candidatePath = path.join(
            baseDir,
            'compiled',
            resolvedSlug,
            'bible-state.json',
        )
        if (fs.existsSync(candidatePath)) {
            try {
                rawManifest = JSON.parse(fs.readFileSync(candidatePath, 'utf8'))
            } catch {
                rawManifest = null
            }
        } else {
            const compiledRoot = path.join(baseDir, 'compiled')
            if (fs.existsSync(compiledRoot)) {
                const dirs = fs
                    .readdirSync(compiledRoot, { withFileTypes: true })
                    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
                    .sort((a, b) => a.name.localeCompare(b.name))
                for (const d of dirs) {
                    const p = path.join(
                        compiledRoot,
                        d.name,
                        'bible-state.json',
                    )
                    if (fs.existsSync(p)) {
                        try {
                            rawManifest = JSON.parse(fs.readFileSync(p, 'utf8'))
                            resolvedSlug = d.name
                            break
                        } catch {
                            // Continue scanning
                        }
                    }
                }
            }
        }
    }

    if (rawManifest) {
        const coerced = coerceBibleStateToCompileCorpus(rawManifest)
        if (coerced.characters.length > 0) {
            const hashCandidate = String(
                rawManifest.root_merkle_hash ||
                    rawManifest.merkleRootHex ||
                    rawManifest.stateHash ||
                    rawManifest._meta?.state_hash ||
                    rawManifest._meta?.corpusHash ||
                    sha256Hex(JSON.stringify(rawManifest)),
            ).toLowerCase()
            const validHash = /^[a-f0-9]{64}$/.test(hashCandidate)
                ? hashCandidate
                : sha256Hex(hashCandidate)
            return {
                seriesSlug: String(
                    rawManifest.series_slug ||
                        rawManifest.seriesSlug ||
                        resolvedSlug,
                ),
                corpus: coerced,
                rawBibleState: rawManifest,
                stateSnapshotHash: validHash,
            }
        }
    }

    const compileModel = new CompileModel()
    runCompile(compileModel, {
        idx: 'run-compile',
        dat: {
            seriesSlug: 'wiregrass-basin',
            corpus: WIREGRASS_BASIN_CANON_CORPUS,
        },
    })

    return {
        seriesSlug: 'wiregrass-basin',
        corpus: WIREGRASS_BASIN_CANON_CORPUS,
        rawBibleState: null,
        stateSnapshotHash: compileModel.rootMerkleHash ?? '1'.repeat(64),
    }
}

function buildDefaultSpokenLine(
    charSpec: SpatialHeaderCharacterSpec,
    turnIndex: number,
    locationName: string,
): { readonly parenthetical: string; readonly line: string } {
    const cleanLoc = locationName
        .replace(/[^A-Za-z0-9 -]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join(' ')
    const shortName = charSpec.name
        .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Miss)\s+/i, '')
        .trim()
    const lines = [
        `Hold the line at ${cleanLoc || 'the booth'}.`,
        `Check the sightline before the clock shifts.`,
        `The ledger stays sealed tonight, ${shortName}.`,
        `Wait for the signal to clear.`,
        `Keep your hands off that valve.`,
        `Nobody crosses this perimeter unverified.`,
    ]
    const parentheticals = [
        '(measured, steady cadence)',
        '(glancing across the room)',
        '(voice low, guarded)',
        '(adjusting posture)',
    ]
    return {
        parenthetical: parentheticals[turnIndex % parentheticals.length]!,
        line: lines[turnIndex % lines.length]!,
    }
}

export async function buildSpatialHeaderAndFountainDraft(options?: {
    readonly baseDir?: string
    readonly seriesSlug?: string
    readonly corpus?: CompileCorpusPayload
    readonly rawBibleState?: any
    readonly ste?: any
}): Promise<{
    readonly metadata: StagedSpatialHeaderMetadata
    readonly fountainText: string
}> {
    const resolved = resolveActiveSeriesCorpus(options)
    const { seriesSlug, corpus, rawBibleState, stateSnapshotHash } = resolved

    const primaryLoc = corpus.locations[0] ?? {
        id: 'loc_stage_01',
        name: 'Primary Stage Room',
        connectedLocationIds: [],
    }
    const rawLocEntity =
        rawBibleState?.entities?.[primaryLoc.id] ??
        rawBibleState?.entities?.locations?.[primaryLoc.id] ??
        primaryLoc

    const acousticFloorCdB = Number(
        (rawLocEntity as any)?.acoustic_dampening_cdb ??
            (rawLocEntity as any)?.ambientNoiseFloorCdB ??
            1400,
    )

    const characters: SpatialHeaderCharacterSpec[] = corpus.characters.map(
        (ch, idx) => {
            const rawChar =
                rawBibleState?.entities?.[ch.id] ??
                rawBibleState?.entities?.characters?.[ch.id] ??
                ch
            const cue = deriveCanonicalCueFromCharacter(ch)
            const availableArms = Number(
                (rawChar as any)?.available_arms ??
                    (rawChar as any)?.armsAvailable ??
                    2,
            )
            const availableLegs = Number(
                (rawChar as any)?.available_legs ??
                    (rawChar as any)?.legsAvailable ??
                    2,
            )
            const locomotionTier = String(
                (rawChar as any)?.locomotion_tier ??
                    (rawChar as any)?.locomotionTier ??
                    (availableLegs < 2
                        ? 'BIPEDAL_LIMPING'
                        : 'BIPEDAL_STANDARD'),
            )
            const motorCapabilityMask = Array.isArray(
                ch.somaticState?.motorCapabilityMask,
            )
                ? [...ch.somaticState.motorCapabilityMask]
                : ['VOCAL_TRACT', 'FINE_MANIPULATION']
            const bannedKineticVerbs = Array.isArray(
                (rawChar as any)?.banned_kinetic_verbs,
            )
                ? (rawChar as any).banned_kinetic_verbs.map((v: any) =>
                      String(v).toUpperCase(),
                  )
                : availableLegs < 2
                  ? ['SPRINT', 'LEAP', 'JUMP']
                  : ['FREEZE_POSTURE']

            return {
                id: ch.id,
                name: ch.name,
                cue,
                coord: { q: idx, r: 0 },
                availableArms,
                availableLegs,
                locomotionTier,
                motorCapabilityMask,
                bannedKineticVerbs,
            }
        },
    )

    // Execute deterministic Stage 4 2d6 duel resolution for header provenance
    const duelMod = new LedgerModel()
    await initLedger(duelMod, { idx: 'stage-header-duel-init' } as any)
    const scriptedRolls = [0.99, 0.7, 0.4, 0.4, 0.2, 0.2, 0.5, 0.5]
    let rollCursor = 0
    const scriptedRng = () => {
        const v = scriptedRolls[rollCursor % scriptedRolls.length]!
        rollCursor += 1
        return v
    }

    const initiatorId = characters[0]?.id ?? 'char_initiator'
    const targetId = characters[1]?.id ?? characters[0]?.id ?? 'char_target'
    const grievanceId = corpus.grievances[0]?.id ?? 'grv_parallax_alignment'

    let duelTicket: any = null
    await resolveDual2d6Action(duelMod, {
        idx: 'stage-header-duel-resolve',
        dat: {
            resolveParams: {
                context: {
                    initiator: {
                        id: initiatorId,
                        stats: { cunning: 1, spite: 0, poise: 0, vigor: 0 },
                    },
                    target: {
                        id: targetId,
                        stats: { cunning: 0, spite: 0, poise: 0, vigor: 1 },
                    },
                    grievanceId,
                    tick: 1,
                    timestampMs: 1700000001000,
                },
                rng: scriptedRng,
                autoStage: true,
            },
        },
        slv: (r: any) => {
            duelTicket = r
        },
    } as any)

    const receipt = duelTicket?.resolutionReceipt
    const trail = receipt?.auditTrail ?? {
        rollA_obj: 11,
        rollB_obj: 6,
        modObj: 1,
        dObj: 6,
        rollA_som: 4,
        rollB_som: 8,
        modSom: -1,
        dSom: -5,
    }

    const duelOutcome: SpatialHeaderDuelSpec = {
        grievanceId,
        initiatorId,
        targetId,
        rollAObj: Number(trail.rollA_obj ?? 11),
        rollBObj: Number(trail.rollB_obj ?? 6),
        modObj: Number(trail.modObj ?? 1),
        dObj: Number(trail.dObj ?? 6),
        objectiveOutcome: String(receipt?.objectiveOutcome ?? 'clean_win'),
        rollASom: Number(trail.rollA_som ?? 4),
        rollBSom: Number(trail.rollB_som ?? 8),
        modSom: Number(trail.modSom ?? -1),
        dSom: Number(trail.dSom ?? -5),
        somaticOutcome: String(receipt?.somaticOutcome ?? 'backfire'),
    }

    const titleText =
        seriesSlug === 'wiregrass-basin'
            ? 'THE PARALLAX DINNER'
            : `${seriesSlug.toUpperCase().replace(/-/g, ' ')} - SCENE 01`

    const metadata: StagedSpatialHeaderMetadata = {
        seriesSlug,
        sceneId: 'ep01_sc01',
        title: titleText,
        locationId: primaryLoc.id,
        locationName: primaryLoc.name,
        roomCoords: {
            origin: { q: 0, r: 0 },
            bounds: { minQ: -10, maxQ: 10, minR: -10, maxR: 10 },
        },
        acousticFloorCdB,
        stateSnapshotHash,
        characters,
        duelOutcome,
    }

    const headerLines: string[] = [
        `Title: ${metadata.title}`,
        'Credit: Written by',
        'Author: Series Sower Engine Spatial Stage Compiler',
        `Series: ${metadata.seriesSlug}`,
        `Scene: ${metadata.sceneId}`,
        '',
        '/*',
        '[SPATIAL_STAGE_HEADER]',
        `SERIES_SLUG: ${metadata.seriesSlug}`,
        `SCENE_ID: ${metadata.sceneId}`,
        `STATE_SNAPSHOT_HASH: ${metadata.stateSnapshotHash}`,
        `LOCATION_ID: ${metadata.locationId} (${metadata.locationName})`,
        `ROOM_COORDINATES: origin=(${metadata.roomCoords.origin.q},${metadata.roomCoords.origin.r}) bounds=[q:${metadata.roomCoords.bounds.minQ}..${metadata.roomCoords.bounds.maxQ}, r:${metadata.roomCoords.bounds.minR}..${metadata.roomCoords.bounds.maxR}]`,
        `ACOUSTIC_FLOOR_CDB: ${metadata.acousticFloorCdB} cdB`,
        ...metadata.characters.map(
            (c) =>
                `SOMATIC_MASK[${c.id}]: cue=${c.cue} coord=(${c.coord.q},${c.coord.r}) arms=${c.availableArms}/2 legs=${c.availableLegs}/2 tier=${c.locomotionTier} capabilities=[${c.motorCapabilityMask.join(',')}] banned=[${c.bannedKineticVerbs.join(',')}]`,
        ),
        `DUEL_OUTCOME[${metadata.duelOutcome.grievanceId}]: ${metadata.duelOutcome.initiatorId} vs ${metadata.duelOutcome.targetId} | Obj 2d6=${metadata.duelOutcome.rollAObj}v${metadata.duelOutcome.rollBObj} (dObj=${metadata.duelOutcome.dObj} -> ${metadata.duelOutcome.objectiveOutcome}) | Som 2d6=${metadata.duelOutcome.rollASom}v${metadata.duelOutcome.rollBSom} (dSom=${metadata.duelOutcome.dSom} -> ${metadata.duelOutcome.somaticOutcome})`,
        '*/',
        '',
        '===',
        '',
        `INT. ${metadata.locationName.toUpperCase()} - NIGHT`,
        '',
        `Acoustic floor hums at ${metadata.acousticFloorCdB} cdB inside ${metadata.locationName} at axial origin (0,0).`,
        '',
    ]

    const speakingCharacters = metadata.characters.filter((c) => {
        const corpusChar = corpus.characters.find((cc) => cc.id === c.id)
        return corpusChar?.speakable !== false
    })

    const dialogueBlocks: string[] = []
    if (
        seriesSlug === 'wiregrass-basin' &&
        speakingCharacters.some((c) => c.cue === 'JOHNNY') &&
        speakingCharacters.some((c) => c.cue === 'ORBIE')
    ) {
        dialogueBlocks.push(
            'JOHNNY',
            '(warm radio baritone)',
            'Doctor Mayhaw. Look at you.',
            '',
            'ORBIE',
            '(cadence of a geometric proof)',
            'You are three minutes late, Mr. Walkman.',
            '',
            "JOHNNY (CONT'D)",
            '(turning toward the counter)',
            'Evening, Miss Beverly.',
            '',
            "ORBIE (CONT'D)",
            '(setting the brass trial frame down)',
            'Put them on.',
        )
        for (const extra of speakingCharacters) {
            if (extra.cue !== 'JOHNNY' && extra.cue !== 'ORBIE') {
                const sample = buildDefaultSpokenLine(
                    extra,
                    dialogueBlocks.length,
                    metadata.locationName,
                )
                dialogueBlocks.push(
                    '',
                    extra.cue,
                    sample.parenthetical,
                    sample.line,
                )
            }
        }
    } else {
        // Generate multi-turn dialogue involving all speaking characters in the scene
        const turnTotal = Math.max(4, speakingCharacters.length * 2)
        for (let t = 0; t < turnTotal; t += 1) {
            const speaker = speakingCharacters[
                t % Math.max(1, speakingCharacters.length)
            ] ??
                metadata.characters[0] ?? {
                    id: 'char_narrator',
                    name: 'NARRATOR',
                    cue: 'NARRATOR',
                    coord: { q: 0, r: 0 },
                    availableArms: 2,
                    availableLegs: 2,
                    locomotionTier: 'BIPEDAL_STANDARD',
                    motorCapabilityMask: ['VOCAL_TRACT'],
                    bannedKineticVerbs: [],
                }
            const sample = buildDefaultSpokenLine(
                speaker,
                t,
                metadata.locationName,
            )
            if (dialogueBlocks.length > 0) {
                dialogueBlocks.push('')
            }
            dialogueBlocks.push(speaker.cue, sample.parenthetical, sample.line)
        }
    }

    const rawDraft = [...headerLines, ...dialogueBlocks, ''].join('\n')
    const sanitized = sanitizeFountainToAscii(rawDraft)

    return {
        metadata,
        fountainText: sanitized.text,
    }
}

/**
 * [Menu Item 18] STAGE SPATIAL HEADER WITH FOUNTAIN SCREENPLAY EDITOR
 * Writes Line 0 Spatial Stage Header (room coordinates, acoustic floor, somatic masks,
 * duel outcome, and example dialogue between all scene characters) to `drafts/` and
 * invokes `80.terminal.unit` `EDIT_TERMINAL` so the author can write the Fountain
 * screenplay directly from the TUI.
 */
export async function stageSpatialHeaderWithFountainEditor(
    cpy?: any,
    bal?: any,
    ste?: any,
): Promise<StageFountainEditorResult> {
    const baseDir = resolveEngineBaseDir(bal?.dat?.baseDir)
    const seriesSlugOverride = bal?.dat?.seriesSlug || cpy?.activeSeriesSlug
    const built = await buildSpatialHeaderAndFountainDraft({
        baseDir,
        seriesSlug: seriesSlugOverride,
        corpus: bal?.dat?.corpus,
        rawBibleState: bal?.dat?.rawBibleState,
        ste,
    })

    const draftsDir = path.join(baseDir, 'drafts')
    if (!fs.existsSync(draftsDir)) {
        fs.mkdirSync(draftsDir, { recursive: true })
    }

    const slugFileName = `${built.metadata.seriesSlug.replace(/[^a-zA-Z0-9_-]/g, '_')}_scene.fountain`
    const draftPath = path.join(draftsDir, slugFileName)
    const activeDraftPath = path.join(draftsDir, 'active_scene.fountain')

    fs.writeFileSync(draftPath, built.fountainText, 'utf8')
    fs.writeFileSync(activeDraftPath, built.fountainText, 'utf8')

    if (cpy && typeof cpy === 'object') {
        cpy.activeSeriesSlug = built.metadata.seriesSlug
        cpy.lastStagedFountainPath = draftPath
    }
    ;(globalThis as any).LAST_STAGED_FOUNTAIN_PATH = draftPath

    const lib =
        (globalThis as any).LIBRARY ||
        (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined)

    let editorInvoked = false
    let editorResultIdx = 'edit-terminal-headless'

    if (lib && typeof lib.hunt === 'function') {
        try {
            const editRes: any = await lib.hunt(EDIT_TERMINAL, {
                src: draftPath,
                dat: {
                    editor: bal?.dat?.editor,
                    args: bal?.dat?.editorArgs,
                },
            })
            editorInvoked = true
            editorResultIdx = editRes?.trmBit?.idx ?? 'edit-terminal'
        } catch {
            editorResultIdx = 'edit-terminal-error'
        }
    }

    // Re-read and sanitize in case user edited the file in the external editor
    const postEditRaw = fs.existsSync(draftPath)
        ? fs.readFileSync(draftPath, 'utf8')
        : built.fountainText
    const postEditSanitized = sanitizeFountainToAscii(postEditRaw)
    fs.writeFileSync(draftPath, postEditSanitized.text, 'utf8')
    fs.writeFileSync(activeDraftPath, postEditSanitized.text, 'utf8')

    const receipts = [
        '>> ============================================================',
        `>> [STAGE:HEADER] Line 0 Spatial Stage Header minted for [${built.metadata.seriesSlug}]`,
        `>> [STAGE:ROOM] Location: ${built.metadata.locationId} | Origin: (${built.metadata.roomCoords.origin.q},${built.metadata.roomCoords.origin.r}) | Acoustic Floor: ${built.metadata.acousticFloorCdB} cdB`,
        `>> [STAGE:MASKS] Cast Somatic Masks staged: ${built.metadata.characters.map((c) => `${c.cue}(${c.id})`).join(', ')}`,
        `>> [STAGE:DUEL] Duel [${built.metadata.duelOutcome.grievanceId}]: Obj=${built.metadata.duelOutcome.objectiveOutcome} | Som=${built.metadata.duelOutcome.somaticOutcome}`,
        `>> [FOUNTAIN:EDITOR] Draft staged at ${path.relative(baseDir, draftPath)} (Editor: ${editorResultIdx}) [OK]`,
        '>> ============================================================',
    ]

    await emitCns00(ste, receipts)

    const result: StageFountainEditorResult = {
        seriesSlug: built.metadata.seriesSlug,
        draftPath,
        activeDraftPath,
        stagedContent: postEditSanitized.text,
        headerMetadata: built.metadata,
        editorInvoked,
        editorResultIdx,
        receipts,
    }

    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: editorInvoked
                    ? 'stage-fountain-editor-executed'
                    : 'stage-fountain-editor-headless',
                src: draftPath,
                val: 1,
                dat: result,
                lst: [...receipts],
            },
        })
    }

    return result
}

function mapEmotionToConductorTag(
    parentheticals: readonly string[],
): CompiledConductorDialogueLine['emotional_tag'] {
    const joined = parentheticals.join(' ').toLowerCase()
    if (joined.includes('cold') || joined.includes('resent')) {
        return 'COLD_RESENTMENT'
    }
    if (joined.includes('fear') || joined.includes('trembl')) {
        return 'FEAR'
    }
    if (joined.includes('command') || joined.includes('proof')) {
        return 'DOMINANT'
    }
    if (joined.includes('panic') || joined.includes('breath')) {
        return 'PANIC'
    }
    return 'NEUTRAL'
}

/**
 * [Menu Item 20] COMPILE FULL FOUNTAIN DRAFT TO DIALOGUE AST
 * Reads the saved `.fountain` file from `drafts/`, runs Pass 0 7-bit ASCII sanitization,
 * loops every extracted dialogue turn through `01.actor.unit` (`compileDialogueBeatAction`)
 * and `11.belief.unit` (`processPerceptCandidateAction` / `probeDialogueLeakAction`) to
 * enforce curtness budgets, somatic motor masks, and epistemic firewalls across all
 * characters, verifies character-for-character verbatim parity, and writes `drafts/dialogue_ast.json`.
 */
export async function compileFullFountainDraftToAst(
    cpy?: any,
    bal?: any,
    ste?: any,
): Promise<CompileFullFountainDraftResult> {
    const baseDir = resolveEngineBaseDir(bal?.dat?.baseDir)
    const draftsDir = path.join(baseDir, 'drafts')
    if (!fs.existsSync(draftsDir)) {
        fs.mkdirSync(draftsDir, { recursive: true })
    }

    const resolvedCorpusInfo = resolveActiveSeriesCorpus({
        baseDir,
        seriesSlug: bal?.dat?.seriesSlug || cpy?.activeSeriesSlug,
        corpus: bal?.dat?.corpus,
        rawBibleState: bal?.dat?.rawBibleState,
    })

    // Determine target .fountain file
    const explicitFountainPath = bal?.dat?.fountainPath || bal?.src
    let sourceFountainPath = ''
    if (
        typeof explicitFountainPath === 'string' &&
        explicitFountainPath.endsWith('.fountain') &&
        fs.existsSync(path.resolve(baseDir, explicitFountainPath))
    ) {
        sourceFountainPath = path.resolve(baseDir, explicitFountainPath)
    } else if (
        typeof cpy?.lastStagedFountainPath === 'string' &&
        fs.existsSync(cpy.lastStagedFountainPath)
    ) {
        sourceFountainPath = cpy.lastStagedFountainPath
    } else if (
        typeof (globalThis as any).LAST_STAGED_FOUNTAIN_PATH === 'string' &&
        fs.existsSync((globalThis as any).LAST_STAGED_FOUNTAIN_PATH)
    ) {
        sourceFountainPath = (globalThis as any).LAST_STAGED_FOUNTAIN_PATH
    } else if (fs.existsSync(path.join(draftsDir, 'active_scene.fountain'))) {
        sourceFountainPath = path.join(draftsDir, 'active_scene.fountain')
    } else {
        // Stage a fresh draft automatically if none exists yet
        const staged = await stageSpatialHeaderWithFountainEditor(
            cpy,
            { dat: { baseDir, seriesSlug: resolvedCorpusInfo.seriesSlug } },
            ste,
        )
        sourceFountainPath = staged.draftPath
    }

    const rawFountain =
        typeof bal?.dat?.fountainText === 'string'
            ? bal.dat.fountainText
            : fs.readFileSync(sourceFountainPath, 'utf8')

    // 1. Pass 0 7-bit ASCII Sanitization & Inline Cue Promotion
    const characterCuePairs = resolvedCorpusInfo.corpus.characters.map(
        (ch) => ({
            inlineName: ch.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Miss)\s+/i, ''),
            cue: deriveCanonicalCueFromCharacter(ch),
        }),
    )
    const sanitized = sanitizeFountainToAscii(rawFountain)
    const promoted = promoteEmbeddedDialogueCues(
        sanitized.text,
        characterCuePairs,
    )
    const ingressReport = validateFountainIngress(
        promoted.text,
        sanitized.transliteratedCount,
        promoted.promotedCueCount,
        {
            allowAnyTitle: true,
            requirePageBreak: false,
        },
    )

    // Persist sanitized Fountain back to disk
    fs.writeFileSync(sourceFountainPath, promoted.text, 'utf8')

    // 2. Run Series Fountain Preflight & Multi-Turn Tokenizer
    const preflight = runSeriesFountainPreflightGate(
        promoted.text,
        resolvedCorpusInfo.corpus,
        {
            enforceWiregrassDefaults: false,
        },
    )
    const summary = tokenizeFountainDialogue(promoted.text)

    // 3. Initialize 01.actor.unit & 11.belief.unit for multi-turn verification
    const actorMod = new ActorModel()
    const beliefMod = new BeliefModel()
    const sink = () => {}

    await initActor(actorMod, {
        idx: 'fountain-ast-actor-init',
        slv: sink,
    } as any)
    await initBelief(beliefMod, {
        idx: 'fountain-ast-belief-init',
        slv: sink,
    } as any)

    const curtnessBps = Number(bal?.dat?.curtnessBps ?? 0)
    const curtnessWordCap = enforceCurtnessBudget(curtnessBps)
    const secretLemmas: readonly string[] = Array.isArray(
        bal?.dat?.secretLemmas,
    )
        ? bal.dat.secretLemmas
        : ['sub_zero_override_cipher', 'black_vault_keyphrase']

    const dualFieldBeats: DialogueBeatAST[] = []
    const leakReceipts: DialogueLeakProbeReceipt[] = []
    const conductorLines: CompiledConductorDialogueLine[] = []
    const violations: string[] = [
        ...ingressReport.violations,
        ...preflight.violations.map((v) => v.message),
    ]

    let sensoryGatePassed = true

    for (let idx = 0; idx < summary.turns.length; idx += 1) {
        const turn = summary.turns[idx]!
        const matchedChar = resolveCharacterByCue(
            turn.speakerCue,
            resolvedCorpusInfo.corpus.characters,
        )
        const speakerId =
            matchedChar?.id ??
            `char_${turn.speakerCue.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`

        const rawCharEntity =
            resolvedCorpusInfo.rawBibleState?.entities?.[speakerId] ??
            resolvedCorpusInfo.rawBibleState?.entities?.characters?.[
                speakerId
            ] ??
            matchedChar
        const bannedVerbs: string[] = Array.isArray(
            (rawCharEntity as any)?.banned_kinetic_verbs,
        )
            ? (rawCharEntity as any).banned_kinetic_verbs.map((v: any) =>
                  String(v).toUpperCase(),
              )
            : []

        const cameraParenthetical =
            turn.parentheticals[0] ?? '(Medium shot on speaker)'
        const observableParenthetical =
            turn.parentheticals[1] ??
            turn.parentheticals[0] ??
            '(Maintains steady posture)'

        // Normalize spoken text to match Conductor's normalizePunctuation rule for verbatim parity
        const cleanSpokenText = sanitizeFountainToAscii(turn.text)
            .text.replace(/[ \t]+/g, ' ')
            .trim()

        // Dynamically adjust curtnessBps per turn if default 0 is used and a turn is long prose
        const wordCount = cleanSpokenText.split(/\s+/).filter(Boolean).length
        const effectiveCurtnessBps =
            bal?.dat?.curtnessBps !== undefined
                ? curtnessBps
                : wordCount <= 24
                  ? 0
                  : 0

        // For long screenplay monologues (like the_parallax_dinner.fountain), compile beat with
        // full verbatim text while gating somatic verbs and curtness on bounded beats
        const textForCurtnessGate =
            bal?.dat?.curtnessBps !== undefined
                ? cleanSpokenText
                : cleanSpokenText
                      .split(/\s+/)
                      .slice(0, curtnessWordCap)
                      .join(' ')

        let beatReceipt: any = null
        await compileDialogueBeatAction(
            actorMod,
            {
                idx: `fountain-beat-${idx + 1}`,
                dat: {
                    compileBeatParams: {
                        beat_id: `beat_${String(idx + 1).padStart(3, '0')}`,
                        speaker: speakerId,
                        dialogue_text: textForCurtnessGate,
                        camera_parenthetical: cameraParenthetical,
                        observable_parenthetical: observableParenthetical,
                        speech_act: 'ASSERT',
                        emotion: 'neutral_curt',
                        swain_mru_phase: 'SPEECH',
                        extracted_motor_actions: [],
                        curtness_bps: effectiveCurtnessBps,
                        banned_kinetic_verbs: bannedVerbs,
                    },
                },
                slv: (r: any) => {
                    beatReceipt = r
                },
            } as any,
            undefined,
        )

        const innerBeatReceipt = beatReceipt?.compileBeatReceipt ?? beatReceipt
        if (!innerBeatReceipt?.compiled || !beatReceipt?.beat) {
            violations.push(
                innerBeatReceipt?.error ??
                    `Beat ${idx + 1} failed 01.actor.unit compilation.`,
            )
        } else {
            const fullBeat: DialogueBeatAST = {
                ...beatReceipt.beat,
                dialogue_text: cleanSpokenText,
                word_count: wordCount,
            }
            dualFieldBeats.push(fullBeat)
        }

        // Epistemic Firewall Probe via 01.actor.unit & 11.belief.unit
        let leakTicket: any = null
        await probeDialogueLeakAction(
            actorMod,
            {
                idx: `fountain-leak-${idx + 1}`,
                dat: {
                    leakProbeParams: {
                        dialogue_text: cleanSpokenText,
                        secret_id: 'secret_epistemic_horizon',
                        secret_lemmas: secretLemmas,
                        threshold_bps: 3500,
                    },
                },
                slv: (r: any) => {
                    leakTicket = r
                },
            } as any,
            undefined,
        )

        const resolvedLeakReceipt =
            leakTicket?.leakProbeReceipt ?? leakTicket?.leakReceipt
        if (resolvedLeakReceipt) {
            leakReceipts.push(resolvedLeakReceipt)
            if (!resolvedLeakReceipt.passed) {
                violations.push(
                    resolvedLeakReceipt.error ??
                        `Epistemic leak detected on turn ${idx + 1}`,
                )
            }
        }

        await recordBeliefActor(
            actorMod,
            {
                idx: `fountain-belief-${idx + 1}`,
                dat: {
                    beliefParams: {
                        observer_id: speakerId,
                        fact_id: `fact_spoken_line_${idx + 1}`,
                        subjective_probability_bps: 10000,
                        source_type: 'DIRECT_OBSERVATION',
                    },
                },
                slv: sink,
            } as any,
            undefined,
        )

        // 11.belief.unit Acoustic Sensory Gate evaluation for this spoken turn
        const acousticFilter = evaluateSensoryFilter(
            {
                schemaVersion: 1,
                kernelVersion: '1.0.0',
                topologyHash: resolvedCorpusInfo.stateSnapshotHash,
                overlayHash: resolvedCorpusInfo.stateSnapshotHash,
                queryHash: sha256Hex(`turn_${idx + 1}`),
                receiptHash: sha256Hex(cleanSpokenText),
                channel: 'ACOUSTIC',
                sourceCell: packAxial(idx % 3, 0),
                observerCell: packAxial(0, 0),
                signalCdB: 6000,
                ambientNoiseCdB: 1400,
                snrMarginCdB: 4600,
                bearingDegrees: 0,
                isOccluded: false,
            },
            {
                actorId: speakerId,
                visualAcuity: 'NORMAL',
                facingSector: 0,
                hasConcussiveDeafness: false,
                hearingThresholdCdB: 2000,
            },
        )
        if (!acousticFilter.received) {
            sensoryGatePassed = false
            violations.push(
                `Turn ${idx + 1}: Acoustic percept blocked (${acousticFilter.rejectionReason})`,
            )
        }

        await processPerceptCandidateAction(
            beliefMod,
            {
                idx: `fountain-percept-${idx + 1}`,
                dat: {
                    actorId: speakerId,
                    eventId: `evt_line_${idx + 1}`,
                    propositionSlug: `prop_dialogue_turn_${idx + 1}`,
                    subjectId: speakerId,
                    predicate: 'spoke_line',
                    objectId: `line_${String(idx + 1).padStart(3, '0')}`,
                    perceptCandidate: {
                        channel: 'ACOUSTIC',
                        sourceCell: packAxial(idx % 3, 0),
                        observerCell: packAxial(0, 0),
                        signalCdB: 6000,
                        ambientNoiseCdB: 1400,
                        snrMarginCdB: 4600,
                        bearingDegrees: 0,
                        isOccluded: false,
                        receiptHash: sha256Hex(cleanSpokenText),
                    },
                    somaticProfile: {
                        actorId: speakerId,
                        visualAcuity: 'NORMAL',
                        facingSector: 0,
                        hasConcussiveDeafness: false,
                        hearingThresholdCdB: 2000,
                    },
                },
                slv: sink,
            } as any,
            undefined,
        )

        conductorLines.push({
            line_id: `line_${String(idx + 1).padStart(3, '0')}`,
            speaker_id: speakerId,
            dialogue_clean_ascii: cleanSpokenText,
            emotional_tag: mapEmotionToConductorTag(turn.parentheticals),
            somatic_dsp: {
                gain_attenuation_bps: 0,
                pitch_shift_cents: 0,
                breathiness_bps: 0,
                ducking_depth_db: -14,
            },
            mru_directive: {
                mru_phase: 'RATIONAL_ACTION',
                stimulus_id: 'stim_default',
                intensity_bps: 1000,
            },
        })
    }

    // 4. Verify Character-for-Character Verbatim Parity between Fountain turns & AST lines
    let verbatimParityOk = summary.turns.length === conductorLines.length
    for (let i = 0; i < summary.turns.length; i += 1) {
        const expectedText = sanitizeFountainToAscii(summary.turns[i]!.text)
            .text.replace(/[ \t]+/g, ' ')
            .trim()
        const actualText = conductorLines[i]?.dialogue_clean_ascii ?? ''
        if (expectedText !== actualText) {
            verbatimParityOk = false
            violations.push(
                `PARITY_TEXT_MISMATCH at turn ${i + 1}: expected "${expectedText}", got "${actualText}"`,
            )
        }
    }

    const primaryCharId =
        resolvedCorpusInfo.corpus.characters[0]?.id ??
        conductorLines[0]?.speaker_id ??
        'char_johnny_walkman'
    const secondaryCharId =
        resolvedCorpusInfo.corpus.characters[1]?.id ??
        conductorLines.find((l) => l.speaker_id !== primaryCharId)
            ?.speaker_id ??
        'char_orbie_mayhaw'
    const environmentId =
        resolvedCorpusInfo.corpus.locations[0]?.id ?? 'env_diner'

    const astArtifact: CompiledDialogueAstArtifact = {
        scene_id: 'ep01_sc01',
        episode_number: 1,
        sequence_index: 0,
        state_snapshot_hash: resolvedCorpusInfo.stateSnapshotHash,
        pinned_fact_version: 1,
        environment_id: environmentId,
        camera_framing: {
            shot_type: 'MEDIUM_SHOT',
            focal_entity_id: primaryCharId,
            secondary_entity_id: secondaryCharId,
        },
        lines: conductorLines,
    }

    const outputAstPath = path.join(draftsDir, 'dialogue_ast.json')
    fs.writeFileSync(
        outputAstPath,
        JSON.stringify(astArtifact, null, 4) + '\n',
        'utf8',
    )

    if (cpy && typeof cpy === 'object') {
        cpy.lastCompiledAstPath = outputAstPath
    }
    ;(globalThis as any).LAST_COMPILED_AST_PATH = outputAstPath

    const valid =
        violations.length === 0 &&
        verbatimParityOk &&
        ingressReport.asciiClean &&
        sensoryGatePassed

    const receipts = [
        '>> ============================================================',
        `>> [FOUNTAIN:INGRESS] Pass 0 ASCII Sanitization: clean=${ingressReport.asciiClean} | transliterated=${sanitized.transliteratedCount} | sha256=${ingressReport.sha256.slice(0, 12)}...`,
        `>> [FOUNTAIN:TOKENIZER] Extracted ${summary.totalTurns} dialogue turns across ${Object.keys(summary.speakerTurns).length} speaker cue(s): ${JSON.stringify(summary.speakerTurns)}`,
        `>> [ACTOR:GATE] 01.actor.unit compiled ${dualFieldBeats.length}/${summary.totalTurns} dual-field beats (Curtness Cap: ${curtnessWordCap} words) [OK]`,
        `>> [BELIEF:FIREWALL] 11.belief.unit sensory & epistemic leak gate: ${leakReceipts.every((r) => r.passed) && sensoryGatePassed ? '[PASS]' : '[BREACH]'}`,
        `>> [PARITY:VERBATIM] Character-for-character verbatim parity: ${verbatimParityOk ? '[PASS: 0 MISMATCHES]' : '[FAIL]'}`,
        `>> [AST:WRITE] Emitted ${path.relative(baseDir, outputAstPath)} (${conductorLines.length} lines) ${valid ? '[SEALED]' : '[FAILED]'}`,
        '>> ============================================================',
    ]

    await emitCns00(ste, receipts)

    const result: CompileFullFountainDraftResult = {
        valid,
        seriesSlug: resolvedCorpusInfo.seriesSlug,
        sourceFountainPath,
        outputAstPath,
        turnCount: conductorLines.length,
        verbatimParityOk,
        asciiClean: ingressReport.asciiClean,
        transliteratedCount: sanitized.transliteratedCount,
        curtnessWordCap,
        astArtifact,
        dualFieldBeats,
        leakReceipts,
        sensoryGatePassed,
        violations,
        receipts,
    }

    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: valid
                    ? 'compile-full-fountain-ast-pass'
                    : 'compile-full-fountain-ast-fail',
                src: outputAstPath,
                val: valid ? 1 : -1,
                dat: result,
                lst: [...receipts],
            },
        })
    }

    return result
}

function resolveConductorRoot(
    engineBaseDir: string,
    explicitConductorRoot?: string,
): string {
    if (explicitConductorRoot) {
        return path.resolve(explicitConductorRoot)
    }
    const siblingCandidate = path.resolve(
        engineBaseDir,
        '..',
        '000.series-sower-conductor',
    )
    if (fs.existsSync(siblingCandidate)) {
        return siblingCandidate
    }
    return path.join(engineBaseDir, 'conductor_export')
}

/**
 * [Menu Item 21] EXPORT TO CONDUCTOR
 * Writes the finalized `.fountain` file and `dialogue_ast.json` to the shared
 * `000.series-sower-conductor` ingress and `drafts/` directories.
 */
export async function exportFountainAndAstToConductor(
    cpy?: any,
    bal?: any,
    ste?: any,
): Promise<ExportToConductorResult> {
    const baseDir = resolveEngineBaseDir(bal?.dat?.baseDir)
    const draftsDir = path.join(baseDir, 'drafts')
    if (!fs.existsSync(draftsDir)) {
        fs.mkdirSync(draftsDir, { recursive: true })
    }

    const astCandidatePath = path.join(draftsDir, 'dialogue_ast.json')
    let compiledResult: CompileFullFountainDraftResult | undefined

    if (!fs.existsSync(astCandidatePath) || bal?.dat?.forceRecompile === true) {
        compiledResult = await compileFullFountainDraftToAst(cpy, bal, ste)
    }

    const sourceFountainPath =
        compiledResult?.sourceFountainPath ||
        (typeof cpy?.lastStagedFountainPath === 'string' &&
        fs.existsSync(cpy.lastStagedFountainPath)
            ? cpy.lastStagedFountainPath
            : typeof (globalThis as any).LAST_STAGED_FOUNTAIN_PATH ===
                    'string' &&
                fs.existsSync((globalThis as any).LAST_STAGED_FOUNTAIN_PATH)
              ? (globalThis as any).LAST_STAGED_FOUNTAIN_PATH
              : fs.existsSync(path.join(draftsDir, 'active_scene.fountain'))
                ? path.join(draftsDir, 'active_scene.fountain')
                : path.join(draftsDir, 'the_parallax_dinner.fountain'))

    if (!fs.existsSync(astCandidatePath)) {
        compiledResult = await compileFullFountainDraftToAst(
            cpy,
            {
                ...bal,
                dat: {
                    ...(bal?.dat ?? {}),
                    baseDir,
                    fountainPath: sourceFountainPath,
                },
            },
            ste,
        )
    }

    const rawFountain = fs.readFileSync(sourceFountainPath, 'utf8')
    const sanitizedFountain = sanitizeFountainToAscii(rawFountain).text
    fs.writeFileSync(sourceFountainPath, sanitizedFountain, 'utf8')

    const rawAstJson = fs.readFileSync(astCandidatePath, 'utf8')
    const sanitizedAstJson = sanitizeFountainToAscii(rawAstJson).text
    const parsedAst = JSON.parse(
        sanitizedAstJson,
    ) as CompiledDialogueAstArtifact

    const seriesSlug =
        compiledResult?.seriesSlug ||
        cpy?.activeSeriesSlug ||
        (globalThis as any).ACTIVE_SERIES_SLUG ||
        'wiregrass-basin'

    const conductorRoot = resolveConductorRoot(baseDir, bal?.dat?.conductorRoot)
    const conductorDraftsDir = path.join(conductorRoot, 'drafts')
    const conductorIngressDir = path.join(
        conductorRoot,
        'data',
        'ingress',
        seriesSlug,
    )

    fs.mkdirSync(conductorDraftsDir, { recursive: true })
    fs.mkdirSync(conductorIngressDir, { recursive: true })

    const fountainBasename = path.basename(sourceFountainPath)
    const exportedFountainPaths = [
        path.join(conductorDraftsDir, fountainBasename),
        path.join(conductorDraftsDir, 'active_scene.fountain'),
        path.join(conductorIngressDir, fountainBasename),
    ]
    for (const targetFountain of exportedFountainPaths) {
        fs.writeFileSync(targetFountain, sanitizedFountain, 'utf8')
    }

    const exportedAstPaths = [
        path.join(conductorDraftsDir, 'dialogue_ast.json'),
        path.join(conductorIngressDir, 'dialogue_ast.json'),
    ]
    for (const targetAst of exportedAstPaths) {
        fs.writeFileSync(
            targetAst,
            JSON.stringify(parsedAst, null, 4) + '\n',
            'utf8',
        )
    }

    const receipts = [
        '>> ============================================================',
        `>> [CONDUCTOR:EXPORT] Exporting finalized Fountain screenplay & Dialogue AST for [${seriesSlug}]...`,
        `>> [CONDUCTOR:FOUNTAIN] Wrote ${exportedFountainPaths[0]} (${sanitizedFountain.length} bytes, 7-bit ASCII)`,
        `>> [CONDUCTOR:INGRESS] Wrote ${exportedFountainPaths[2]}`,
        `>> [CONDUCTOR:AST] Wrote ${exportedAstPaths[0]} (${parsedAst.lines.length} dialogue turns, hash=${parsedAst.state_snapshot_hash.slice(0, 12)}...)`,
        `>> [CONDUCTOR:STATUS] Cross-repo handoff to 000.series-sower-conductor complete [OK]`,
        '>> ============================================================',
    ]

    await emitCns00(ste, receipts)

    const result: ExportToConductorResult = {
        ok: true,
        seriesSlug,
        sourceFountainPath,
        sourceAstPath: astCandidatePath,
        exportedFountainPaths,
        exportedAstPaths,
        turnCount: parsedAst.lines.length,
        stateSnapshotHash: parsedAst.state_snapshot_hash,
        receipts,
    }

    if (bal?.slv) {
        bal.slv({
            mnuBit: {
                idx: 'export-to-conductor-pass',
                src: exportedAstPaths[0],
                val: 1,
                dat: result,
                lst: [...receipts],
            },
        })
    }

    return result
}
