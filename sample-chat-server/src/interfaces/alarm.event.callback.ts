import { EventInterface } from "./event";

export interface AlarmEventCallback {
    (event:EventInterface): void
}