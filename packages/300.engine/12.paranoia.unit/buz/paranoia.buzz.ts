import type { ParanoiaModel } from '../paranoia.model';
import type ParanoiaBit from '../fce/paranoia.bit';
import type State from '../../99.core/state';
import type { ParanoiaClockRecord } from '../fce/paranoia.interface';

const assertBasisPoints = (val: number, label: string): number => {
  if (!Number.isInteger(val)) {
    throw new Error(`[FLOAT_PROHIBITED] ${label} must be an integer, got: ${val}`);
  }
  if (val < 0 || val > 10000) {
    throw new Error(`[OUT_OF_BOUNDS] ${label} must be between 0 and 10000 bps, got: ${val}`);
  }
  return val;
};

export const initParanoia = (cpy: ParanoiaModel, bal: ParanoiaBit, ste: State) => {
  cpy.clocks = {};
  if (bal?.slv) {
    bal.slv({ parBit: { idx: 'init-paranoia', val: 0 } });
  }
  return cpy;
};

export const updateParanoia = (cpy: ParanoiaModel, bal: ParanoiaBit, ste: State) => {
  if (bal?.slv) {
    bal.slv({ parBit: { idx: 'update-paranoia' } });
  }
  return cpy;
};

export const upsertClockParanoia = async (
  cpy: ParanoiaModel,
  bal: ParanoiaBit,
  ste: State,
) => {
  try {
    const p = bal?.dat as Partial<ParanoiaClockRecord>;
    if (!p?.clock_id || !p?.entity_id || !p?.clock_name) {
      throw new Error('[MALFORMED_INPUT] clock_id, entity_id, and clock_name are required');
    }

    const valBps = assertBasisPoints(p.value_bps ?? 0, 'value_bps');
    const thresholdBps = assertBasisPoints(p.threshold_bps ?? 8000, 'threshold_bps');
    const decayRateBps = assertBasisPoints(p.decay_rate_bps ?? 500, 'decay_rate_bps');
    const isTriggered = valBps >= thresholdBps ? 1 : 0;

    const record: ParanoiaClockRecord = {
      clock_id: p.clock_id.trim(),
      entity_id: p.entity_id.trim(),
      clock_name: p.clock_name.trim(),
      value_bps: valBps,
      threshold_bps: thresholdBps,
      decay_rate_bps: decayRateBps,
      is_triggered: isTriggered,
      updated_at_ms: p.updated_at_ms ?? 0,
    };

    cpy.clocks[record.clock_id] = record;

    if (ste?.hunt) {
      await ste.hunt('[Console action] Update Console', {
        idx: 'cns00',
        src: `>> [PARANOIA:UPSERT] ${record.clock_id} [${record.clock_name}] | ${record.value_bps}/${record.threshold_bps} bps | Triggered: ${record.is_triggered}`,
      }).catch(() => {});
    }

    if (bal?.slv) {
      bal.slv({ parBit: { idx: 'upsert-clock-paranoia', dat: record, val: record.value_bps } });
    }
  } catch (err: any) {
    if (ste?.hunt) {
      await ste.hunt('[Console action] Update Console', {
        idx: 'cns00',
        src: `:: [PARANOIA:ERR] ${err.message}`,
      }).catch(() => {});
    }
    if (bal?.slv) {
      bal.slv({ parBit: { idx: 'upsert-clock-paranoia-error', src: err.message, val: -1 } });
    }
  }

  return cpy;
};

export const tickClockParanoia = async (
  cpy: ParanoiaModel,
  bal: ParanoiaBit,
  ste: State,
) => {
  try {
    const p = bal?.dat as {
      clock_id: string;
      delta_bps: number;
      timestamp_ms?: number;
    };

    if (!p?.clock_id || !cpy.clocks[p.clock_id]) {
      throw new Error(`[CLOCK_NOT_FOUND] Paranoia clock ${p?.clock_id} does not exist`);
    }

    if (!Number.isInteger(p.delta_bps)) {
      throw new Error(`[FLOAT_PROHIBITED] delta_bps must be integer, got: ${p.delta_bps}`);
    }

    const clock = cpy.clocks[p.clock_id];
    const nextVal = Math.min(10000, Math.max(0, clock.value_bps + p.delta_bps));
    const wasTriggered = clock.is_triggered;
    const isTriggered = nextVal >= clock.threshold_bps ? 1 : 0;

    clock.value_bps = nextVal;
    clock.is_triggered = isTriggered;
    clock.updated_at_ms = p.timestamp_ms ?? clock.updated_at_ms;

    if (ste?.hunt) {
      const boilNote = isTriggered && !wasTriggered ? ' [!] BOIL-OVER TRIPPED' : '';
      await ste.hunt('[Console action] Update Console', {
        idx: 'cns00',
        src: `>> [PARANOIA:TICK] ${clock.clock_id}: ${nextVal}/${clock.threshold_bps} bps${boilNote}`,
      }).catch(() => {});
    }

    if (bal?.slv) {
      bal.slv({ parBit: { idx: 'tick-clock-paranoia', dat: clock, val: nextVal } });
    }
  } catch (err: any) {
    if (ste?.hunt) {
      await ste.hunt('[Console action] Update Console', {
        idx: 'cns00',
        src: `:: [PARANOIA:ERR] ${err.message}`,
      }).catch(() => {});
    }
    if (bal?.slv) {
      bal.slv({ parBit: { idx: 'tick-clock-paranoia-error', src: err.message, val: -1 } });
    }
  }

  return cpy;
};

export const decayClockParanoia = async (
  cpy: ParanoiaModel,
  bal: ParanoiaBit,
  ste: State,
) => {
  let decayedCount = 0;
  for (const id in cpy.clocks) {
    const clk = cpy.clocks[id];
    if (clk.value_bps > 0) {
      const nextVal = Math.max(0, clk.value_bps - clk.decay_rate_bps);
      clk.value_bps = nextVal;
      clk.is_triggered = nextVal >= clk.threshold_bps ? 1 : 0;
      decayedCount++;
    }
  }

  if (bal?.slv) {
    bal.slv({ parBit: { idx: 'decay-clock-paranoia', val: decayedCount } });
  }
  return cpy;
};

export const sweepBoilOverParanoia = (
  cpy: ParanoiaModel,
  bal: ParanoiaBit,
  ste: State,
) => {
  const breached = Object.values(cpy.clocks).filter((c) => c.is_triggered === 1);
  if (bal?.slv) {
    bal.slv({ parBit: { idx: 'sweep-boil-over-paranoia', lst: breached, val: breached.length } });
  }
  return cpy;
};

export const resetClockParanoia = async (
  cpy: ParanoiaModel,
  bal: ParanoiaBit,
  ste: State,
) => {
  const clockId = bal?.src || (bal?.dat as any)?.clock_id;
  if (!clockId || !cpy.clocks[clockId]) {
    if (bal?.slv) {
      bal.slv({ parBit: { idx: 'reset-clock-paranoia-error', src: 'Clock not found', val: -1 } });
    }
    return cpy;
  }

  const clock = cpy.clocks[clockId];
  clock.value_bps = 0;
  clock.is_triggered = 0;

  if (bal?.slv) {
    bal.slv({ parBit: { idx: 'reset-clock-paranoia', dat: clock, val: 0 } });
  }
  return cpy;
};