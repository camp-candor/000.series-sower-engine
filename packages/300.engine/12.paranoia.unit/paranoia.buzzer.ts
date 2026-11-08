/**
 * 12.paranoia.unit - Paranoia Buzzer Barrel Export
 */
export {
    initParanoia,
    updateParanoia,
    tickClockAction,
    applyThermodynamicImpulseAction,
    sweepThermodynamicsAction,
    auditThermodynamicsAction,
    dispatchClockAction,
    decayClocksAction,
    queryClockStateAction,
    assertBasisPoints,
    deriveTripwirePhase,
    calculateCurrentSegment,
} from './buz/paranoia.buzz.js'
export type {
    ParanoiaClockState,
    ClockTickParams,
    ThermodynamicImpulseParams,
    ThermodynamicFlowReceipt,
    ThermodynamicAuditReport,
    ClockDispatchTrigger,
    ClockDispatchResult,
    ClockDispatchType,
    TripwirePhase,
} from './fce/paranoia.interface.js'
export type {
    ParanoiaPayload,
} from './fce/paranoia.bit.js'
