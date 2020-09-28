import { EventInterface } from "./event";

export interface EventResponseRegisterErrorInterface {
    code: number,
    message: string,
    messageReceived: string,
    formatVerificationErrors: Array<any>
}