import { CompileCorpusPayload } from '../fce/compile.bit.js'

export const WIREGRASS_BASIN_CANON_CORPUS: CompileCorpusPayload = {
    characters: [
        {
            id: 'char_johnny_walkman',
            name: 'Johnny Walkman',
            vocalCue: 'JOHNNY',
            aliases: ['JOHNNY', 'JOHNNY WALKMAN'],
            speakable: true,
            somaticState: {
                motorCapabilityMask: [
                    'HEAVY_REACH',
                    'VOCAL_TRACT',
                    'BIPEDAL_SWAY',
                    'FINE_MANIPULATION',
                ],
                enduranceBp: 8800,
                stressBp: 3200,
                coherenceBp: 7900,
            },
        },
        {
            id: 'char_orbie_mayhaw',
            name: 'Dr. Orbie Mayhaw',
            vocalCue: 'ORBIE',
            aliases: ['ORBIE', 'DR. ORBIE MAYHAW'],
            speakable: true,
            somaticState: {
                motorCapabilityMask: [
                    'EUCLIDEAN_POSTURE',
                    'VOCAL_TRACT',
                    'FINE_MANIPULATION',
                    'OPTICAL_CALIBRATION',
                ],
                enduranceBp: 7400,
                stressBp: 4100,
                coherenceBp: 9600,
            },
        },
        {
            id: 'char_miss_beverly',
            name: 'Miss Beverly (Waitress)',
            vocalCue: 'WAITRESS',
            aliases: ['WAITRESS', 'MISS BEVERLY'],
            speakable: false,
            somaticState: {
                motorCapabilityMask: ['BIPEDAL_STAND', 'TABLE_SERVICE'],
                enduranceBp: 4200,
                stressBp: 7600,
                coherenceBp: 6800,
            },
        },
    ],
    locations: [
        {
            id: 'loc_dixie_starlight_lot',
            name: 'Dixie-Starlight Truck Stop Parking Lot',
            connectedLocationIds: [
                'loc_dixie_starlight_diner',
                'loc_orbie_airstream',
            ],
            capacityBp: 10000,
        },
        {
            id: 'loc_dixie_starlight_diner',
            name: 'Dixie-Starlight Diner Interior',
            connectedLocationIds: ['loc_dixie_starlight_lot'],
            capacityBp: 6500,
        },
        {
            id: 'loc_orbie_airstream',
            name: 'Dr. Mayhaw Mobile Optometry Airstream',
            connectedLocationIds: ['loc_dixie_starlight_lot'],
            capacityBp: 2500,
        },
    ],
    possessions: [
        {
            id: 'pos_johnny_headset',
            name: 'Military-Grade Boom-Mic Headset',
            holderCharacterId: 'char_johnny_walkman',
            durabilityBp: 9200,
        },
        {
            id: 'pos_orbie_trial_frame',
            name: 'Brass-and-Steel Trial Lens Frame',
            holderCharacterId: 'char_orbie_mayhaw',
            durabilityBp: 9900,
        },
        {
            id: 'pos_orbie_gloves',
            name: 'White Cotton Inspection Gloves',
            holderCharacterId: 'char_orbie_mayhaw',
            durabilityBp: 8500,
        },
    ],
    grievances: [
        {
            id: 'grv_orbie_blur_contempt',
            sourceCharacterId: 'char_orbie_mayhaw',
            targetCharacterId: 'char_johnny_walkman',
            intensityBp: 7200,
            dependsOnGrievanceIds: [],
        },
        {
            id: 'grv_johnny_clinical_pity',
            sourceCharacterId: 'char_johnny_walkman',
            targetCharacterId: 'char_orbie_mayhaw',
            intensityBp: 6400,
            dependsOnGrievanceIds: ['grv_orbie_blur_contempt'],
        },
    ],
}
