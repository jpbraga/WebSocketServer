import { EventInterface } from "./event";

export interface EventResponseInterface {
    code: number,
    message: string,
    event: EventInterface
}