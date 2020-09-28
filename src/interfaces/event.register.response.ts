import { EventInterface } from "./event";

export interface EventResponseRegisterInterface {
    code: number,
    message: string,
    event: EventInterface
}