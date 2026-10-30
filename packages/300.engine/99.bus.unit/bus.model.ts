import Bus from './fce/bus.interface.js'

export class BusModel implements Bus {
    MQTT: any
    actList: any
    client: any
    host: string = 'mqtt://localhost:1883'
    bus!: Function
    responseSuffix: string = '-response'
    promises: any = {}
}
