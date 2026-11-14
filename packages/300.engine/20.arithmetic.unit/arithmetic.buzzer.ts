export {
    arithmeticBuzz,
    computeCombinedPacingMultiplierBps,
    computeHorizonProgressBps,
    computeSolarDayProgressBps,
    resolveThreeActStage,
} from './buz/arithmetic.buzz.js'
export type { PacingActStageLocal } from './buz/arithmetic.buzz.js'
export {
    fnv1a32,
    mulberry32Step,
    deriveDeterministicUint32,
    deriveDeterministicSeedInt,
    nextDeterministicRoll,
    rollDeterministic2d6,
    pickDeterministicIndex,
} from './buz/arithmetic.buzz.js'
export {
    assertBasisPoint,
    assertBigIntBasisPoint,
    toBasisPoint,
    toBigIntBasisPoint,
    isBasisPoint,
    isBigIntBasisPoint,
    BASIS_POINT_MIN,
    BASIS_POINT_MAX,
    BASIS_POINT_SCALE,
    BASIS_POINT_DENOMINATOR,
    TIE_BREAK_REMAINDER,
    type BasisPoint,
    type BigIntBasisPoint,
    type ScalingDivisionResult,
    type BigIntScalingDivisionResult,
} from './fce/arithmetic.interface.js'
export {
    scaleBasisPoints,
    scaleBasisPointsChained,
    divRoundHalfEven,
    evaluateScalingDivision,
    MAX_INTERMEDIATE_PRODUCT,
} from './arithmetic.action.js'
export {
    scaleBasisPointsBigInt,
    scaleBasisPointsBigIntChained,
    divRoundHalfEvenBigInt,
    evaluateScalingDivisionBigInt,
} from './arithmetic-bigint.action.js'
