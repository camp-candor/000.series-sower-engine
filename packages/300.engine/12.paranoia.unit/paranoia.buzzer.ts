/**
 * 12.paranoia.unit - Paranoia Buzzer Barrel Export
 */
export {
    initParanoia,
    updateParanoia,
    tickClockAction,
    dispatchClockAction,
    decayClocksAction,
    queryClockStateAction,
    assertBasisPoints,
} from './buz/paranoia.buzz.js'
export type {
    ParanoiaClockState,
    ClockTickParams,
    ClockDispatchTrigger,
    ClockDispatchResult,
    ClockDispatchType,
} from './fce/paranoia.interface.js'
export type {
    ParanoiaPayload,
} from './fce/paranoia.bit.js'
