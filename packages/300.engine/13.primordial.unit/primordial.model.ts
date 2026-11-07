/**
 * 13.primordial.unit - Primordial Model State Container
 */
import type Primordial from './fce/primordial.interface.js'
import type { PrimordialBaselinePayload } from './fce/primordial.interface.js'

export const DEFAULT_PRIMORDIAL_BASELINE: PrimordialBaselinePayload = {
    seriesSlug: 'wiregrass-basin',
    founderTokenId: 'item_founder_token',
    originLocationId: 'loc_the_warm_pipe',
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
            fatigueBps: 2400,
            painBps: 0,
            refusalStrainBps: 0,
            openWounds: [],
            bannedKineticVerbs: [],
            heldItems: ['item_founder_token'],
            wornGear: ['gear_scavenger_hood'],
            slungItems: [],
            cachedItems: ['item_rusted_key'],
        },
        {
            entityId: 'char_wart',
            locationId: 'loc_the_warm_pipe',
            coordQ: 1,
            coordR: 0,
            armsAvailable: 1,
            legsAvailable: 2,
            locomotionTier: 'UNRESTRICTED',
            concussionLevel: 0,
            fatigueBps: 1800,
            painBps: 1200,
            refusalStrainBps: 0,
            openWounds: ['wnd_crushed_left_forearm'],
            bannedKineticVerbs: ['BIMANUAL_LIFT', 'CLIMB'],
            heldItems: [],
            wornGear: ['gear_canvas_smock'],
            slungItems: ['item_grease_bucket'],
            cachedItems: [],
        },
    ],
    grievances: [
        {
            grievanceId: 'grv_territorial_impasse',
            instigatorId: 'char_wart',
            victimId: 'char_bog',
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
            clockName: 'CULVERT_BREACH_PARANOIA',
            valueBps: 2400,
            thresholdBps: 7500,
            decayRateBps: 50,
        },
        {
            clockId: 'clk_wart_resentment',
            entityId: 'char_wart',
            clockName: 'RATION_HOARDING_SUSPICION',
            valueBps: 3200,
            thresholdBps: 8000,
            decayRateBps: 40,
        },
    ],
}

export class PrimordialModel implements Primordial {
    idx: string = '13.primordial'
    hRoot: string = ''
    genesisSeeded: boolean = false
    baseline: PrimordialBaselinePayload = DEFAULT_PRIMORDIAL_BASELINE
}

export default PrimordialModel
