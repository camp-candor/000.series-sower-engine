import State from './99.core/state.js'
import * as Import from './BEE.js'

let isInitialized = false

export class Sim {
    state: State = new State()
    pivot: State = new State()
    bus: any

    public hunt = async (type: string, bale?: any): Promise<any> => {
        return new Promise((resolve) => {
            this.init()

            bale = bale || {}
            bale.slv = resolve

            this.state.dispatch({ type, bale })
        })
    }

    private init() {
        if (isInitialized) return
        isInitialized = true

        this.state.hunt = this.hunt
        this.pivot.hunt = this.hunt
        this.state.pivot = this.pivot
        this.pivot.pivot = this.state

        for (const k in Import.list) {
            new Import.list[k](sim.state)
        }

        if (this.bus) {
            this.state.bus = this.bus
            this.pivot.bus = this.bus
        }
    }
}

const sim: any = new Sim()
sim.hunt = sim.hunt
export default sim
