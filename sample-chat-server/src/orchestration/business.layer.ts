import express = require('express');
import { EventNotification } from "../services/event.notification";
import { LogService } from "../util/log.services";
import { MessageEventNotification } from "../interfaces/event.message.notification";
import { RESTApi } from "../api/rest";
import { REST_EVENT_TYPES } from "../api/consts/rest.event.types";
import { Environment } from "../util/environment";
import { ENV_VARS } from "../util/consts/env.vars";
import { SPECIAL_MSG_TYPES } from "./consts/special.msg.types";
import { ChatServer } from '../business/chat.server';
import { JWTAuthorizer } from '../authorizer/authorizer';

const entity: string = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";

export class BusinessLayer {

    private log: LogService;
    private auth: JWTAuthorizer;
    private uidKey: string = Environment.getValue(ENV_VARS.JWT_IDENTIFIER, "uid");
    constructor(private cs: ChatServer,
        private en: EventNotification,
        private rest: RESTApi) {
        this.log = LogService.getInstnce();
        this.auth = new JWTAuthorizer();
    }

    public async init() {

        this.rest.registerEventListener(async (event: MessageEventNotification) => {
            const payload = (!event.content.payload) ? '{}' : event.content.payload
            this.processRESTApiEvents(event.type, JSON.parse(payload), event.content[this.uidKey], event.content.res);
        });

        this.log.info(entity, 'Business layer ready!');
    }

    private processRESTApiEvents(type: number, content: any, sender?: string, res?: express.Response) {
        let address = Environment.getValue(ENV_VARS.SERVER_FINDER_URL, null);
        switch (type) {
            case REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                let payload: any = this.processMessage(content.data.message);
                if (payload) {
                    address += Environment.getValue(ENV_VARS.EVENT_SEND_MESSAGE, 'sendMessage');
                    address += `/${content.data[this.uidKey]}`;

                } else {
                    if(this.processDirect(content.data.message)) {
                        let split = content.data.message.split(' ');
                        let msg = "";
                        for(let i = 2 ; i < split.length ; i++) {
                            msg += split + " ";
                        }
                        let uid = this.cs.getUid(split[1]);
                        if(!uid || msg.length === 0) break;
                        payload = {
                            message: msg
                        };
                        address += Environment.getValue(ENV_VARS.EVENT_SEND_MESSAGE, 'sendMessage');
                        address += `/${uid}`;
                    } else  {
                        address += Environment.getValue(ENV_VARS.EVENT_BROADCAST, 'broadcast');
                        payload = {};
                        payload['message'] = content.data.message;
                        payload[this.uidKey] = content.data[this.uidKey];
                    }
                }
                this.en.request(address,
                    'POST',
                    {
                        payload: JSON.stringify(payload)
                    });
                break;

            case REST_EVENT_TYPES.CONNECTED:
                let token = content.jwt_auth_token;
                this.log.info(entity, `Token received: ${token} `)
                let authorized = this.auth.authorize(token, Environment.getValue(ENV_VARS.JWT_SECRET));
                this.log.info(entity, `User ${authorized.content.name} connected`);
                this.cs.addUser(authorized.uid, authorized.content.name);
                break;


            case REST_EVENT_TYPES.DISCONNECTED:
                for (let user of content.users) {
                    this.log.info(entity, `User ${user} disconnected`);
                    this.cs.removeUser(user);
                }
                break;

            default:
                break;
        }
    }

    private processDirect(msg: string) {
        if(msg.substr(0,4) === SPECIAL_MSG_TYPES.TO) return true;
    }

    private processMessage(msg: string) {
        switch (msg) {
            case SPECIAL_MSG_TYPES.GET_USERS:
                let userList: string = "";
                for (let user of this.cs.getAllUsers()) {
                    userList += `${user}\n`;
                }
                return { message: userList };
                break;
            case SPECIAL_MSG_TYPES.TOTAL_CONNECTED:
                return { message: `total users: ${this.cs.getAllUsers().length}` };
                break;
            default:
                return null;
                break;
        }
    }
}