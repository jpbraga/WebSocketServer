import { MessageEventNotification } from "./event.message.notification";

export interface EventMessageCallback {
    (event:MessageEventNotification): void
}