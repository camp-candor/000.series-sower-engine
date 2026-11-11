/**
 * 10.location.unit - Location Reducer Router
 */
import clone from 'clone-deep'
import * as Act from './location.action.js'
import { LocationModel } from './location.model.js'
import * as Buzz from './location.buzzer.js'
import type State from '../99.core/state.js'

export function reducer(
    model: LocationModel = new LocationModel(),
    act: Act.Actions,
    state?: State,
): LocationModel | Promise<LocationModel> {
    switch (act.type) {
        case Act.INIT_LOCATION:
            return Buzz.initLocation(clone(model), act.bale, state)

        case Act.UPDATE_LOCATION:
            return Buzz.updateLocation(clone(model), act.bale, state)

        case Act.REGISTER_LOCATION:
            return Buzz.registerLocation(clone(model), act.bale as any, state)

        case Act.SET_PORTAL_LOCK:
            return Buzz.setPortalLockAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.VALIDATE_ADJACENCY:
            return Buzz.validateAdjacencyAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.CHECK_PORTAL_CROSSING:
            return Buzz.checkPortalCrossingAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.TRAVERSE_LOCATION:
            return Buzz.traverseLocationAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.AUDIT_TOPOLOGY:
            return Buzz.auditTopologyAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.BIND_SPATIAL_PORT:
            return Buzz.bindSpatialPortAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.EVALUATE_SPATIAL_PATH:
            return Buzz.evaluateSpatialPathAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.EVALUATE_SPATIAL_PERCEPTION:
            return Buzz.evaluateSpatialPerceptionAction(
                clone(model),
                act.bale as any,
                state,
            )

        case Act.SANITIZE_PATH_QUERY: {
            const result = Buzz.sanitizePathQuery(
                (act.bale?.dat as any)?.rawQuery,
            )
            if (act.bale?.slv) {
                act.bale.slv({
                    locBit: {
                        idx: result.ok
                            ? 'sanitize-path-success'
                            : 'sanitize-path-fail',
                        val: result.ok ? 1 : 0,
                        dat: {
                            error: result.error,
                            pathReceipt: result as any,
                        },
                    },
                })
            }
            return model
        }

        case Act.SANITIZE_PERCEPTION_QUERY: {
            const result = Buzz.sanitizePerceptionQuery(
                (act.bale?.dat as any)?.rawQuery,
            )
            if (act.bale?.slv) {
                act.bale.slv({
                    locBit: {
                        idx: result.ok
                            ? 'sanitize-perception-success'
                            : 'sanitize-perception-fail',
                        val: result.ok ? 1 : 0,
                        dat: {
                            error: result.error,
                            perceptCandidate: result as any,
                        },
                    },
                })
            }
            return model
        }

        case Act.BUILD_SPATIAL_OVERLAY: {
            const snapshot = Buzz.buildSpatialOverlaySnapshot(
                model.portals,
                (act.bale?.dat as any)?.dynamicObstacles || [],
                (act.bale?.dat as any)?.costOverrides,
                (act.bale?.dat as any)?.acousticOverrides,
            )
            if (act.bale?.slv) {
                act.bale.slv({
                    locBit: {
                        idx: 'build-spatial-overlay-success',
                        src: snapshot.overlayHash,
                        dat: { overlaySnapshot: snapshot },
                    },
                })
            }
            return model
        }

        case Act.VERIFY_TRAVERSAL_BUDGET: {
            const cost = (act.bale?.dat as any)?.traversalCostUnits ?? 0
            const budget = (act.bale?.dat as any)?.allowedBudgetUnits ?? 0
            const result = Buzz.verifyTraversalBudget(cost, budget)
            if (act.bale?.slv) {
                act.bale.slv({
                    locBit: {
                        idx: result.permitted
                            ? 'verify-budget-success'
                            : 'verify-budget-fail',
                        val: result.permitted ? 1 : 0,
                        dat: result as any,
                    },
                })
            }
            return model
        }

        default:
            return model
    }
}
