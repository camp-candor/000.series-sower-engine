import { BeliefModel } from './belief.model.js'

export default class BeliefUnit {
    static getModel() {
        return new BeliefModel()
    }
}
