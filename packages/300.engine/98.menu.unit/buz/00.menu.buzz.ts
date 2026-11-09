import fs from 'node:fs';
import path from 'node:path';
import { MenuModel } from '../menu.model.js';
import type MenuBit from '../fce/menu.bit.js';
import type { CompiledUniverseDescriptor } from '../fce/menu.interface.js';
import * as ActMnu from '../menu.action.js';
import * as ActEng from '../../00.engine.unit/engine.action.js';
import * as ActGrv from '../../06.grievance.unit/grievance.action.js';
import * as ActLed from '../../08.ledger.unit/ledger.action.js';
import * as ActAct from '../../01.actor.unit/actor.action.js';
import * as ActSte from '../../16.state.unit/state.action.js';
import type State from '../../99.core/state.js';

const UPDATE_GRID = '[Grid action] Update Grid';
const OPEN_CHOICE = '[Open action] Open Choice';
const UPDATE_CONSOLE = '[Console action] Update Console';

export const MENU_CHOICES: readonly string[] = Object.freeze([
  '[01] BOOT ENGINE & ENSURE SCHEMA',
  '[02] STATUS ENGINE & TABLE INVENTORY',
  '[03] AUDIT SIMULATION INVARIANTS',
  '[04] RESET ENGINE TO OFFLINE',
  '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION',
  '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT',
  '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION',
  '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE',
  '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY',
  '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION',
  '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS',
  '[ROOT MENU]',
]);

export function resolveEngineRoot(startDir: string = process.cwd()): string {
  let curr = path.resolve(startDir);
  while (curr && curr !== path.dirname(curr)) {
    if (
      fs.existsSync(path.join(curr, 'compiled')) ||
      fs.existsSync(path.join(curr, 'packages', '300.engine'))
    ) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(startDir);
}

export function validateUniverseManifestShape(candidate: any): boolean {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const slug = candidate.seriesSlug || candidate.slug;
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    return false;
  }

  const hash = candidate.merkleRootHex || candidate.stateHash || candidate._meta?.corpusHash;
  if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
    return false;
  }

  const entities = candidate.entities || candidate;
  const hasCharacters = Boolean(entities.characters && typeof entities.characters === 'object');
  const hasLocations = Boolean(entities.locations && typeof entities.locations === 'object');
  const hasPossessions = Boolean(
    (entities.possessions || entities.items) &&
    typeof (entities.possessions || entities.items) === 'object'
  );
  const hasGrievances = Boolean(entities.grievances && typeof entities.grievances === 'object');

  return hasCharacters && hasLocations && hasPossessions && hasGrievances;
}

export function scanCompiledUniverses(baseDir?: string): CompiledUniverseDescriptor[] {
  const root = baseDir ? path.resolve(baseDir) : resolveEngineRoot();
  const compiledDir = path.join(root, 'compiled');

  if (!fs.existsSync(compiledDir)) {
    return [];
  }

  const entries = fs.readdirSync(compiledDir, { withFileTypes: true });
  const results: CompiledUniverseDescriptor[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) {
      continue;
    }

    const manifestPath = path.join(compiledDir, entry.name, 'bible-state.json');
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    try {
      const stats = fs.statSync(manifestPath);
      const rawContent = fs.readFileSync(manifestPath, 'utf8');
      const parsed = JSON.parse(rawContent);

      if (!validateUniverseManifestShape(parsed)) {
        continue;
      }

      const hash = parsed.merkleRootHex || parsed.stateHash || parsed._meta?.corpusHash || '';

      results.push({
        seriesSlug: entry.name,
        manifestPath,
        byteSize: stats.size,
        merkleRootHex: hash.toLowerCase(),
        hasBibleState: true,
      });
    } catch {
      continue;
    }
  }

  return results.sort((a, b) => a.seriesSlug.localeCompare(b.seriesSlug));
}

export function calculateSubmenuSpan(candidateCount: number): number {
  return Math.min(12, Math.max(6, candidateCount + 2));
}

async function emitConsole(ste: State | undefined, src: string): Promise<void> {
  if (ste && typeof ste.hunt === 'function') {
    await ste.hunt(UPDATE_CONSOLE, { idx: 'cns00', src }).catch(() => {});
  }
  const lib =
    (globalThis as any).LIBRARY ||
    (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined);
  if (lib && typeof lib.hunt === 'function') {
    await lib.hunt(UPDATE_CONSOLE, { idx: 'cns00', src }).catch(() => {});
  }
}

export async function promptAirlockUniverseSelection(
  ste?: State,
  baseDir?: string,
): Promise<string | null> {
  await emitConsole(ste, '>> [AIRLOCK::SCAN] Sweeping compiled/ universe manifests from host volume...');

  const candidates = scanCompiledUniverses(baseDir);

  if (candidates.length === 0) {
    await emitConsole(ste, ':: [ERROR] No valid compiled universe manifests found in compiled/.');
    await emitConsole(ste, ':: Please copy compiled universes from 000.goblin-lore/compiled/.');
    return null;
  }

  await emitConsole(ste, `>> [AIRLOCK::FOUND] ${candidates.length} sealed world artifact(s) detected:`);
  for (const c of candidates) {
    await emitConsole(ste, `>>                  * [${c.seriesSlug}] (${c.byteSize} bytes)`);
  }

  const lib =
    (globalThis as any).LIBRARY ||
    (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined);

  // Headless CI fallback
  if (!lib || typeof lib.hunt !== 'function') {
    const fallbackSlug = candidates[0].seriesSlug;
    await emitConsole(ste, `>> [AIRLOCK::HEADLESS] Auto-selecting target: [${fallbackSlug}]`);
    return fallbackSlug;
  }

  await emitConsole(ste, '>> [AIRLOCK::PROMPT] Presenting operator selection switchboard in left deck...');

  const choiceList = [...candidates.map((c) => c.seriesSlug), '[ABORT AIRLOCK SEQUENCE]'];
  const ySpan = calculateSubmenuSpan(choiceList.length);

  const gridBit: any = await lib.hunt(UPDATE_GRID, {
    x: 0,
    y: 4,
    xSpan: 4,
    ySpan,
  });

  const choiceRes: any = await lib.hunt(OPEN_CHOICE, {
    dat: {
      clr0: 'black',
      clr1: 'green',
      cb: async (focusedSlug: string) => {
        const item = candidates.find((c) => c.seriesSlug === focusedSlug);
        if (item) {
          const shortHash = item.merkleRootHex.slice(0, 16);
          await emitConsole(
            ste,
            `:: [AIRLOCK::PREVIEW] [${item.seriesSlug}] Root: ${shortHash}... | Size: ${item.byteSize}B`,
          );
        } else if (focusedSlug === '[ABORT AIRLOCK SEQUENCE]') {
          await emitConsole(ste, ':: [AIRLOCK::PREVIEW] Cancel selection and return to main flight deck.');
        }
      },
    },
    src: 'vertical',
    lst: choiceList,
    net: gridBit?.grdBit?.dat,
  });

  const picked: string = choiceRes?.chcBit?.src || '';

  if (!picked || picked === '[ABORT AIRLOCK SEQUENCE]') {
    await emitConsole(ste, '>> [AIRLOCK::ABORT] Engine boot aborted by operator. Restoring flight deck.');
    return null;
  }

  await emitConsole(ste, '>> ==============================================================================');
  await emitConsole(ste, '>> [EPIC-08] INITIATING CANON AIRLOCK & DISCRETE REALM VAULT');
  await emitConsole(ste, `>> [AIRLOCK::INGEST] Target selected: [${picked}]`);
  await emitConsole(ste, `>> [AIRLOCK::BYTE_0] Reading compiled/${picked}/bible-state.json`);
  await emitConsole(ste, '>> ==============================================================================');

  return picked;
}

export const initMenu = async (
  cpy: MenuModel,
  bal?: MenuBit,
  ste?: State,
): Promise<MenuModel> => {
  cpy.activeSelection = '';
  cpy.lastActionTimestamp = bal?.dat?.timestampMs || 1700000000000;

  await emitConsole(
    ste,
    '>> [FLIGHT_DECK:READY] 300.ENGINE SIMULATION COCKPIT ONLINE [OK]',
  );

  const lib =
    (globalThis as any).LIBRARY ||
    (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined);

  if (!lib || typeof lib.hunt !== 'function') {
    cpy.isHeadless = true;
    cpy.discoveredUniverses = scanCompiledUniverses();
    if (bal?.slv) {
      bal.slv({
        mnuBit: {
          idx: 'init-menu-headless-pass',
          val: 1,
          src: 'HEADLESS',
        },
      });
    }
    return cpy;
  }

  cpy.isHeadless = false;
  await updateMenu(cpy, { ...(bal as any), slv: undefined }, ste);

  if (bal?.slv) {
    bal.slv({
      mnuBit: {
        idx: 'init-menu-pass',
        val: 1,
        src: 'READY',
      },
    });
  }
  return cpy;
};

export const updateMenu = async (
  cpy: MenuModel,
  bal?: MenuBit,
  ste?: State,
): Promise<MenuModel> => {
  const lib =
    (globalThis as any).LIBRARY ||
    (typeof global !== 'undefined' ? (global as any).LIBRARY : undefined);

  if (!lib || typeof lib.hunt !== 'function') {
    cpy.isHeadless = true;
    cpy.discoveredUniverses = scanCompiledUniverses();
    if (bal?.slv) {
      bal.slv({
        mnuBit: {
          idx: 'update-menu-headless-pass',
          val: 1,
          src: 'HEADLESS',
        },
      });
    }
    return cpy;
  }

  try {
    const gridBit: any = await lib.hunt(UPDATE_GRID, {
      x: 0,
      y: 4,
      xSpan: 4,
      ySpan: 8,
    });

    const choiceBit: any = await lib.hunt(OPEN_CHOICE, {
      dat: { clr0: 'black', clr1: 'yellow' },
      src: 'vertical',
      lst: [...MENU_CHOICES],
      net: gridBit?.grdBit?.dat,
    });

    const selection: string = choiceBit?.chcBit?.src || '';
    cpy.activeSelection = selection;
    cpy.lastActionTimestamp = bal?.dat?.timestampMs || 1700000000000;

    if (selection === '[03] AUDIT SIMULATION INVARIANTS') {
      if (ste && typeof ste.hunt === 'function') {
        ste.hunt(ActEng.AUDIT_ENGINE, {});
      }
    } else {
      await handleMenuSelection(selection, ste, cpy);
    }

    if (selection === '[ROOT MENU]') {
      if (bal?.slv) {
        bal.slv({
          mnuBit: {
            idx: 'root-menu-exit',
            val: 1,
            src: '[ROOT MENU]',
          },
        });
      }
      return cpy;
    }
  } catch (err: any) {
    await emitConsole(ste, `:: [FAIL] Menu flight deck encounter: ${err.message}`);
  }

  if (ste && typeof ste.hunt === 'function') {
    setTimeout(() => {
      ste.hunt(ActMnu.UPDATE_MENU, {}).catch(() => {});
    }, 333);
  }

  if (bal?.slv) {
    bal.slv({
      mnuBit: {
        idx: 'update-menu-pass',
        val: 1,
        src: cpy.activeSelection,
      },
    });
  }

  return cpy;
};

export const handleMenuSelection = async (
  selection: string,
  ste?: State,
  model?: MenuModel,
): Promise<void> => {
  if (!ste || typeof ste.hunt !== 'function') {
    return;
  }

  switch (selection) {
    case '[01] BOOT ENGINE & ENSURE SCHEMA': {
      if (model) model.airlockState = 'SELECTING';
      const selectedSlug = await promptAirlockUniverseSelection(ste);

      if (!selectedSlug) {
        if (model) model.airlockState = 'ABORTED';
        break;
      }

      if (model) {
        model.activeUniverseSlug = selectedSlug;
        model.airlockState = 'DISPATCHED';
      }

      await emitConsole(ste, `>> [MENU:ACTION] Dispatching BOOT_ENGINE with realm [${selectedSlug}]...`);
      await ste.hunt(ActEng.BOOT_ENGINE, {
        dat: {
          bootParams: {
            seriesSlug: selectedSlug,
            seedGenesis: true,
          },
        },
      });
      break;
    }

    case '[02] STATUS ENGINE & TABLE INVENTORY': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching STATUS_ENGINE...');
      await ste.hunt(ActEng.STATUS_ENGINE, {});
      break;
    }


    case '[04] RESET ENGINE TO OFFLINE': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching RESET_ENGINE...');
      await ste.hunt(ActEng.RESET_ENGINE, {});
      break;
    }

    case '[10] EXECUTE STAGE 3 GRIEVANCE LOTTERY & ENCOUNTER SELECTION': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching SELECT_STAGE3_ENCOUNTER...');
      await ste.hunt(ActGrv.SELECT_STAGE3_ENCOUNTER, {
        dat: {
          selectionParams: {
            sceneCast: ['char_bog', 'char_wart'],
            currentTensionBps: 3000,
            tick: 1,
            timestamp_ms: 1700000000000,
          },
        },
      });
      break;
    }

    case '[11] AUDIT STAGING ACCUMULATOR & ATOMIC COMMIT': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching COMMIT_STAGING_LEDGER...');
      await ste.hunt(ActLed.COMMIT_STAGING_LEDGER, {
        dat: { timestampMs: 1700000000000 },
      });
      break;
    }

    case '[12] EXECUTE STAGE 4 DUAL-SET 2D6 CONFLICT RESOLUTION': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching RESOLVE_DUAL_2D6_LEDGER...');
      await ste.hunt(ActLed.RESOLVE_DUAL_2D6_LEDGER, {
        dat: {
          resolveParams: {
            context: {
              initiator: { id: 'char_bog', stats: { cunning: 2, poise: 1 } },
              target: { id: 'char_wart', stats: { spite: 1, vigor: 2 } },
              tick: 1,
              timestampMs: 1700000000000,
            },
            autoStage: true,
          },
        },
      });
      break;
    }

    case '[13] AUDIT UNRATIFIED DETAILS & SALIENCE HARVEST QUEUE': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching STAGE_DETAIL_ACTOR...');
      await ste.hunt(ActAct.STAGE_DETAIL_ACTOR, {
        dat: {
          stageDetailParams: {
            detail_id: 'det_cockpit_green_cup',
            scene_id: 'sc01',
            label_candidate: 'green_enamel_cup',
            category: 'PROP',
            recurrence_count: 3,
            dramatic_turn: 'GAZE_PROXIMITY',
            claim_proposal: 'Chipped green enamel cup on floor',
          },
        },
      });
      break;
    }

    case '[14] EXECUTE DETERMINISTIC STATE FOLD & AUDIT WHY-DIRTY': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching HYDRATE_STATE & WHY_DIRTY_STATE...');
      await ste.hunt(ActSte.HYDRATE_STATE, {
        dat: { hydrateParams: { seriesSlug: 'under-the-floorboards', tick: 1 } },
      });
      await ste.hunt(ActSte.WHY_DIRTY_STATE, {
        dat: { whyDirtyParams: { entityId: 'char_bog' } },
      });
      break;
    }

    case '[15] AUDIT EPISTEMIC HORIZONS & SUBTEXT ATTENUATION': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching BUILD_SUBTEXT_DIRECTIVE_ACTOR...');
      await ste.hunt(ActAct.BUILD_SUBTEXT_DIRECTIVE_ACTOR, {
        dat: {
          subtextParams: {
            actor_id: 'char_bog',
            tension_bps: 8000,
            candidate_props: ['item_copper_tea_kettle'],
            surface_dispute: 'bent kettle lid',
            underlying_conflict: 'fear of seasonal abandonment',
          },
        },
      });
      break;
    }

    case '[16] COMPILE DUAL-FIELD DIALOGUE AST & ENFORCE CURTNESS': {
      await emitConsole(ste, '>> [MENU:ACTION] Dispatching COMPILE_DIALOGUE_BEAT_ACTOR...');
      await ste.hunt(ActAct.COMPILE_DIALOGUE_BEAT_ACTOR, {
        dat: {
          compileBeatParams: {
            beat_id: 'b_cockpit_01',
            speaker: 'char_bog',
            dialogue_text: 'Leave the valve.',
            camera_parenthetical: 'Camera pushes in on Bog jaw.',
            observable_parenthetical: 'Bog stands motionless.',
            speech_act: 'IMPLICIT_WARNING',
            emotion: 'cold_urgency',
            swain_mru_phase: 'SPEECH',
            extracted_motor_actions: ['STAND'],
            curtness_bps: 10000,
          },
        },
      });
      break;
    }
  }
};

export const selectMenuOptionAction = async (
  cpy: MenuModel,
  bal: MenuBit,
  ste?: State,
): Promise<MenuModel> => {
  const selection = bal.dat?.selection || bal.src || '';
  cpy.activeSelection = selection;

  await handleMenuSelection(selection, ste, cpy);

  if (bal.slv) {
    bal.slv({
      mnuBit: {
        idx: 'select-menu-option-pass',
        val: 1,
        src: selection,
      },
    });
  }

  return cpy;
};

