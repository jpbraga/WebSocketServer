import express = require('express');
import Joi = require('joi');
import ip = require('ip');
import http = require('http');
import { LogService } from '../util/log.services';
import { Guid } from '../util/guid';
import { EventMessageCallback } from '../interfaces/event.message.callback';
import { REST_EVENT_TYPES } from './consts/rest.event.types';

const entity: string = "RESTApi";
const PORT = 80;

export class RESTApi {
    private app = express();
    private server = null;
    private log: LogService;
    private eventListeners = {};
    private restApiAddress: string = null;
    private serverId: string = null;

    constructor(serverId: string) {
        this.log = LogService.getInstnce();
        this.serverId = serverId;
        this.app.use(express.json());

        this.app.post(`/${this.serverId}/sendMessage/:uid`, (req: express.Request, res: express.Response) => { this.sendMessageRequest(req,res)});
        this.app.put(`/${this.serverId}/broadcast`, (req: express.Request, res: express.Response) => { this.broadcast(req,res)});
        this.app.get(`/${this.serverId}/health`, (req: express.Request, res: express.Response) => { this.healthCheck(req,res)});
    }

    public async init() {
        return new Promise((resolve, reject) => {
            this.log.info(entity, 'Starting server on port ' + PORT);
            this.server = this.app.listen(PORT, () => {
                let host = ip.address(null, "ipv4");
                let port = this.server.address().port;
                this.log.info(entity, `Server running on: http://${host}/${this.serverId}`);
                this.restApiAddress = `http://${host}/${this.serverId}`;
                resolve(true);
            });
        });
    }

    public getRESTApiAddress(): string {
        return this.restApiAddress;
    }

    public getRestPort(): number {
        return PORT;
    }

    private sendMessageRequestSchema(req, res): ValidationInterface {
        const schema = Joi.object({
            payload: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }

    private sendMessageRequest(req, res) {
        console.log(req.body);
        console.log(req.params);
        const validation = this.sendMessageRequestSchema(req, res);
        if (!validation.isValid) res.send(validation);
        else {
            this.notifyEventListeners(REST_EVENT_TYPES.SEND_MESSAGE_REQUEST, {
                uid: req.params.uid,
                payload: req.body.payload
            });
            res.send(validation);
        }
    }

    private broadcastSchema(req, res): ValidationInterface {
        const schema = Joi.object({
            payload: Joi.string().required()
        });
        return this.validateRequest(req, schema);
    }

    public broadcast(req, res) {
        let data = JSON.parse(req.body.payload);
        const validation = this.broadcastSchema(req, res);
        if (!validation.isValid) res.send(validation);
        else {
            this.notifyEventListeners(REST_EVENT_TYPES.BROADCAST, {
                payload: req.body.payload,
                uid: data.uid
            });
            res.send(validation);
        }
    }

    private healthCheck(req, res) {
        res.send(200);
    }

    // helper functions
    private validateRequest(req, schema): ValidationInterface {
        const options = {
            abortEarly: false, // include all errors
            allowUnknown: true, // ignore unknown props
            stripUnknown: true // remove unknown props
        };
        const { error, value } = schema.validate(req.body, options);
        if (error) {
            return { status: 500, isValid: false, message: `Validation error: ${error.details.map(x => x.message).join(', ')}` };
        } else {
            req.body = value;
            return { status: 200, isValid: true };
        }
    }

    public registerEventListener(callback: EventMessageCallback): string {
        let guid: string = Guid.generateGuid();
        this.eventListeners[guid] = callback;
        return guid;
    }

    public unregisterEventListener(guid: string): void {
        delete this.eventListeners[guid];
    }

    private notifyEventListeners(type: number, content: any): void {
        for (let notification in this.eventListeners) {
            this.eventListeners[notification]({
                content: content,
                type: type
            });
        }
    }
}

export interface ValidationInterface {
    status: number,
    isValid: boolean,
    message?: string
}
