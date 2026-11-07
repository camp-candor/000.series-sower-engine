/**
 * 02.database.unit - Database Buzzer Barrel Export
 */
export {
    initDatabase,
    updateDatabase,
    ensureSchemaDatabase,
    queryDatabase,
    execBatchDatabase,
    checkIntegrityDatabase,
    resetLocalDatabase,
    insertFact,
    updateFactClaim,
    setFactStanding,
    registerScene,
    addSceneDependency,
    queryWhyDirty,
    getFactCentralityTelemetry,
    inspectContinuityDatabase,
} from './buz/database.buzz.js'
export type {
    EventLogRecord,
    EntityLiveRecord,
    StringsLedgerRecord,
    GrievanceStatusRecord,
    ParanoiaClockRecord,
    ActorBeliefRecord,
    UnratifiedDetailRecord,
    FactRecord,
    SceneRecord,
    SceneFactDependencyRecord,
    FactCentralityTelemetry,
    TableStatusReport,
    DatabaseStateReport,
    FactScope,
    FactAuthorityLevel,
    FactStanding,
    SceneStatus,
    DependencyEntityType,
} from './fce/database.interface.js'
export type {
    DatabaseTableName,
    DatabaseOperation,
    DatabasePayload,
} from './fce/database.bit.js'
