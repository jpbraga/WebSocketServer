import { Database } from "../database/database";
import { AlarmEventCallback } from "../interfaces/alarm.event.callback";
import { EventInterface } from "../interfaces/event";
import { Guid } from "../util/guid";
import { LogService } from "../util/log.services";

const entity:string = 'EventAlarm';

export class EventAlarm {

    private log:LogService;
    private alarmPool: Array<NodeJS.Timeout> = [];
    private notificationPool: any = {};
    constructor() {
        this.log = LogService.getInstnce();
    }

    public setAlarmForEvent (event: EventInterface) {
        this.log.info(entity, `Setting event alarm for the event ${event.event} (${event._id}) - on ${new Date(event.when).toString()}`)
        this.alarmPool.push(setTimeout(() => {
            this.notifyAlarmListeners(event);
            this.log.info(entity, `The event ${event.event} (${event._id}) just went off on ${new Date(event.when).toString()}`);
        }, event.when - Date.now()));
    }

    public setAlarms (events: Array<EventInterface>): void {
        for ( let event of events ) this.setAlarmForEvent (event);
    }

    public registerAlarmListener (callback:AlarmEventCallback):string {
        let guid:string  = Guid.generateGuid();
        this.notificationPool[guid] = callback;
        return guid;
    }

    public unregisterAlarmListener (guid:string): void {
       delete this.notificationPool[guid];
    }

    private notifyAlarmListeners(event:EventInterface): void {
        for ( let notification in this.notificationPool) {
            this.notificationPool[notification](event);
        }
    }
}