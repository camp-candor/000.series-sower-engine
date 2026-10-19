import { BehaviorSubject, Subject } from 'rx-lite'
import type { Action } from './interface/action.interface.js'
import UnitModel, * as Effect from '../BEE.js'

export default class State extends BehaviorSubject<any> {
    public hunt: any
    public value: any
    public pivot: any
    public bus: any

    private dispatcher = new Subject<Action>()

    constructor(init: UnitModel = new UnitModel()) {
        super(init)

        this.dispatcher
            .scan(
                (state: any, action: Action) => this.reducedApp(state, action),
                init,
            )
            .subscribe((state: any) => {
                super.onNext(state)
            })
    }

    reducedApp(nextState: any, action: Action) {
        for (const key in Effect.reducer) {
            if (typeof Effect.reducer[key] === 'function') {
                nextState[key] = Effect.reducer[key](
                    nextState[key],
                    action,
                    this,
                )
            }
        }
        return nextState
    }

    dispatch(value: Action) {
        return this.dispatcher.onNext(value)
    }

    pat(value: Action) {
        this.dispatch(value)
    }

    next(value: any) {
        this.dispatcher.onNext(value)
    }
}
