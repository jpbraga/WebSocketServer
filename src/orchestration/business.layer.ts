import { WSServer } from "../api/websocket";
import { Database } from "../database/database";
import { EventAlarm } from "../services/event.alarm";
import { LogService } from "../util/log.services";
import jsonschema = require('jsonschema');
import { EventResponseInterface } from "../interfaces/event.response";
import { EventResponseRegisterErrorInterface } from "../interfaces/event.register.error.response";
import { EventResponseRegisterInterface } from "../interfaces/event.register.response";
import { REQUEST_RESPONSES } from "../api/response.consts";
import { MessageEventNotification } from "../interfaces/event.message.notification";
import { EventInterface } from "../interfaces/event";

const entity:string = "BusinessLayer";

export class BusinessLayer {

    private log:LogService;
    constructor(private db:Database,
                private ea:EventAlarm,
                private ws:WSServer,
                private validator: jsonschema.Validator) {
        this.log = LogService.getInstnce();
    }

    public init () {
        this.ws.registerMessageListener(async (event:MessageEventNotification) => {
            this.ws.sendMessage(event.sender, await this.executeCommand(event.content));
        });
        this.log.debug(entity,'WebSocket Message Listener registered!');

        this.ea.registerAlarmListener((event:EventInterface) => {
            this.ws.sendBroadcast({
                code: REQUEST_RESPONSES.EVENT,
                message: `The event ${event.event} (${event._id}) just went off.`,
                event: event
            })
        });
        this.log.debug(entity,'Event Alarm Listener registered!');

        this.log.info(entity,'Business layer ready!');
    }

    private async executeCommand(message: string): Promise<EventResponseInterface | EventResponseRegisterInterface | EventResponseRegisterErrorInterface> {

        let vResponse: jsonschema.ValidatorResult = null;
        try {
            let jEvent = JSON.parse(message);
            vResponse = this.validateEvent(jEvent);
            if (!vResponse.valid) throw new Error(JSON.stringify(vResponse.errors));
            else {
                let event = await this.db.insert(jEvent);
                this.ea.setAlarmForEvent(event.ops[0]);
                return {
                    code: REQUEST_RESPONSES.SUCCESS,
                    message: 'Event was registered.',
                    event: event.ops[0]
                };
            }
        } catch (error) {
            this.log.warn(entity, `Could not parse the event insertion request`);
            this.log.debug(entity, error.message);
            return {
                code: REQUEST_RESPONSES.ERROR,
                message: 'No event was inserted for the message received.',
                messageReceived: message,
                formatVerificationErrors: vResponse?.errors
            };
        }
    }

    private validateEvent(jsonEvent: any): jsonschema.ValidatorResult {
        const schema = {
            "id": "/Event",
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "event": {
                    "type": "string",
                    "minLength": 4,
                    "maxLength": 13
                },
                "when": {
                    "type": "number",
                    "minimum": Date.now()
                }
            },
            "required": ["event", "when"]
        };
        return this.validator.validate(jsonEvent, schema);
    }

}