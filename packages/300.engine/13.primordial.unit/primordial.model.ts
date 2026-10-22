import type Primordial from './fce/primordial.interface'
import type { PrimordialBaselinePayload } from './fce/primordial.interface'

export const DEFAULT_PRIMORDIAL_BASELINE: PrimordialBaselinePayload = {
    seriesSlug: 'under-the-floorboards',
    version: 1,
    originLocationId: 'loc_the_warm_pipe',
    founderTokenId: 'item_founder_token',
    entities: [
        {
            entityId: 'char_bog',
            locationId: 'loc_the_warm_pipe',
            coordQ: 0,
            coordR: 0,
            armsAvailable: 2,
            legsAvailable: 2,
            locomotionTier: 'UNRESTRICTED',
            concussionLevel: 0,
            fatigueBps: 0,
            painBps: 0,
            refusalStrainBps: 0,
            openWounds: [],
            bannedKineticVerbs: [],
            heldItems: ['item_founder_token'],
            wornGear: { belt: 'item_scrap_pouch' },
            slungItems: [],
            cachedItems: [],
        },
        {
            entityId: 'char_wart',
            locationId: 'loc_the_warm_pipe',
            coordQ: 1,
            coordR: 0,
            armsAvailable: 1,
            legsAvailable: 2,
            locomotionTier: 'LIMPING',
            concussionLevel: 0,
            fatigueBps: 1500,
            painBps: 2500,
            refusalStrainBps: 500,
            openWounds: ['laceration_left_shoulder'],
            bannedKineticVerbs: ['BIMANUAL_LIFT', 'SPRINT'],
            heldItems: [],
            wornGear: {},
            slungItems: [],
            cachedItems: [],
        },
    ],
    grievances: [
        {
            grievanceId: 'grv_territorial_impasse',
            instigatorId: 'char_bog',
            victimId: 'char_wart',
            escalationDepth: 1,
            cooldownCycles: 0,
            intensityBps: 2500,
            status: 'ACTIVE',
        },
    ],
    clocks: [
        {
            clockId: 'clk_bog_paranoia',
            entityId: 'char_bog',
            clockName: 'paranoia_baseline',
            valueBps: 2500,
            thresholdBps: 7500,
            decayRateBps: 50,
        },
        {
            clockId: 'clk_wart_paranoia',
            entityId: 'char_wart',
            clockName: 'paranoia_baseline',
            valueBps: 4000,
            thresholdBps: 7500,
            decayRateBps: 50,
        },
    ],
}

export class PrimordialModel implements Primordial {
    idx = '13.primordial'
    hRoot = '0'.repeat(64)
    genesisSeeded = false
    baseline: PrimordialBaselinePayload = { ...DEFAULT_PRIMORDIAL_BASELINE }
}

export default PrimordialModel
