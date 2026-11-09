import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  calculateSubmenuSpan,
  promptAirlockUniverseSelection,
} from './buz/00.menu.buzz.js';

describe('98.menu.unit :: Terminal Airlock Submenu Selection Presentation (Phase 2)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sower-airlock-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('calculates dynamic grid ySpan bounded between 6 and 12', () => {
    expect(calculateSubmenuSpan(1)).toBe(6);
    expect(calculateSubmenuSpan(2)).toBe(6);
    expect(calculateSubmenuSpan(4)).toBe(6);
    expect(calculateSubmenuSpan(5)).toBe(7);
    expect(calculateSubmenuSpan(8)).toBe(10);
    expect(calculateSubmenuSpan(20)).toBe(12);
  });

  it('falls back cleanly in headless mode when no LIBRARY is present', async () => {
    const compiledPath = path.join(tempDir, 'compiled');
    const slugDir = path.join(compiledPath, 'wiregrass-basin');
    fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(
      path.join(slugDir, 'bible-state.json'),
      JSON.stringify({
        seriesSlug: 'wiregrass-basin',
        schemaVersion: '1.0.0',
        merkleRootHex: 'd'.repeat(64),
        entities: {
          characters: { char_bog: {} },
          locations: { loc_pipe: {} },
          possessions: { item_knife: {} },
          grievances: { grv_impasse: {} },
        },
      }),
      'utf8',
    );

    const picked = await promptAirlockUniverseSelection(undefined, tempDir);
    expect(picked).toBe('wiregrass-basin');
  });

  it('returns null and logs error if no compiled universes exist', async () => {
    const emptyTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-compiled-'));
    const picked = await promptAirlockUniverseSelection(undefined, emptyTemp);
    expect(picked).toBeNull();
    fs.rmSync(emptyTemp, { recursive: true, force: true });
  });

  it('renders interactive choice list and returns picked slug when LIBRARY is present', async () => {
    const compiledPath = path.join(tempDir, 'compiled');
    for (const slug of ['blessed-and-the-bounded', 'wiregrass-basin']) {
      const slugDir = path.join(compiledPath, slug);
      fs.mkdirSync(slugDir, { recursive: true });
      fs.writeFileSync(
        path.join(slugDir, 'bible-state.json'),
        JSON.stringify({
          seriesSlug: slug,
          schemaVersion: '1.0.0',
          merkleRootHex: 'e'.repeat(64),
          entities: { characters: {}, locations: {}, possessions: {}, grievances: {} },
        }),
        'utf8',
      );
    }

    const mockHunt = vi.fn().mockImplementation((action: string, bale: any) => {
      if (action === '[Grid action] Update Grid') {
        return Promise.resolve({ grdBit: { dat: {} } });
      }
      if (action === '[Open action] Open Choice') {
        expect(bale.lst).toContain('blessed-and-the-bounded');
        expect(bale.lst).toContain('wiregrass-basin');
        expect(bale.lst).toContain('[ABORT AIRLOCK SEQUENCE]');
        expect(bale.dat?.clr1).toBe('green');
        return Promise.resolve({ chcBit: { src: 'wiregrass-basin' } });
      }
      return Promise.resolve({});
    });

    (globalThis as any).LIBRARY = { hunt: mockHunt };

    const selected = await promptAirlockUniverseSelection(undefined, tempDir);
    expect(selected).toBe('wiregrass-basin');

    delete (globalThis as any).LIBRARY;
  });

  it('handles operator abort cleanly returning null', async () => {
    const compiledPath = path.join(tempDir, 'compiled');
    const slugDir = path.join(compiledPath, 'wiregrass-basin');
    fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(
      path.join(slugDir, 'bible-state.json'),
      JSON.stringify({
        seriesSlug: 'wiregrass-basin',
        schemaVersion: '1.0.0',
        merkleRootHex: 'f'.repeat(64),
        entities: { characters: {}, locations: {}, possessions: {}, grievances: {} },
      }),
      'utf8',
    );

    const mockHunt = vi.fn().mockImplementation((action: string) => {
      if (action === '[Grid action] Update Grid') {
        return Promise.resolve({ grdBit: { dat: {} } });
      }
      if (action === '[Open action] Open Choice') {
        return Promise.resolve({ chcBit: { src: '[ABORT AIRLOCK SEQUENCE]' } });
      }
      return Promise.resolve({});
    });

    (globalThis as any).LIBRARY = { hunt: mockHunt };

    const selected = await promptAirlockUniverseSelection(undefined, tempDir);
    expect(selected).toBeNull();

    delete (globalThis as any).LIBRARY;
  });
});

