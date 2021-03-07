import { WSServer } from "../api/websocket";
import { Database } from "../database/database";
import { EventNotification } from "../services/event.notification";
import { LogService } from "../util/log.services";
import { MessageEventNotification } from "../interfaces/event.message.notification";
import { RESTApi } from "../api/rest";
import { WEBSOCKET_EVENT_TYPES } from "../api/consts/websocket.event.types";
import { REST_EVENT_TYPES } from "../api/consts/rest.event.types";
import { Environment } from "../util/environment";
import { ENV_VARS } from "../util/consts/env.vars";
import { SERVER_QUERY_TYPE } from "./consts/server.queries";
import ip = require('ip');

const entity: string = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";

export class BusinessLayer {

    private log: LogService;
    constructor(private db: Database,
        private en: EventNotification,
        private ws: WSServer,
        private rest: RESTApi,
        private serverId: string) {
        this.log = LogService.getInstnce();
        this.log.info(entity, `Server reference id is ${this.serverId}`);
    }

    public async init() {
        this.ws.registerEventListener(async (event: MessageEventNotification) => {
            this.processWSEvents(event.type, event.content, event.sender);
        });
        this.log.debug(entity, 'WebSocket events listener registered!');

        this.rest.registerEventListener(async (event: MessageEventNotification) => {
            this.processRESTApiEvents(event.type, JSON.parse(event.content.payload), event.content.uid);
        });
        this.log.debug(entity, 'RESTApi event listener registered!');

        await this.db.set(REDIS_SERVERS_LIST, JSON.stringify({
            serverId: this.serverId,
            address: this.rest.getRESTApiAddress()
        }));
        this.log.debug(entity, `Server ${this.serverId} registered in Redis`);

        this.log.info(entity, 'Business layer ready!');
    }

    private async processWSEvents(type: number, content: any, sender?: string) {
        switch (type) {
            case WEBSOCKET_EVENT_TYPES.CONNECTED:
                this.db.insert(sender, this.rest.getRESTApiAddress());
                this.db.set(this.serverId, sender);
                await this.en.request(
                    Environment.getValue(ENV_VARS.EVENT_CONNECTED_URL, null),
                    'POST',
                    {
                        uid: sender,
                        timestamp: Date.now()
                    });
                break;
            case WEBSOCKET_EVENT_TYPES.DISCONNECTED:
                this.db.delete(sender);
                this.db.removeSet(this.serverId, sender);
                await this.en.request(
                    Environment.getValue(ENV_VARS.EVENT_DISCONNECTED_URL, null),
                    'POST',
                    {
                        uid: sender,
                        timestamp: Date.now()
                    });
                break;
            case WEBSOCKET_EVENT_TYPES.MESSAGE:
                if(parseInt(Environment.getValue(ENV_VARS.SERVER_QUERY, '0')) === 1) {
                    const queryContent = this.processServerQueries(content);
                    if(queryContent !== {}) {
                        this.ws.sendMessage(sender, JSON.stringify(queryContent));
                        return;
                    }
                }
                await this.en.request(
                    Environment.getValue(ENV_VARS.EVENT_MESSAGE_URL, null),
                    'POST',
                    {
                        uid: sender,
                        data: content,
                        timestamp: Date.now()
                    });
                break;

            default:
                break;
        }
    }

    private processRESTApiEvents(type: number, content: any, sender?: string,) {
        switch (type) {
            case REST_EVENT_TYPES.BROADCAST:
                this.ws.sendBroadcast(JSON.stringify({ payload: content }), sender);
                break;
            case REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                this.ws.sendMessage(sender, JSON.stringify({ payload: content }));
                break;

            default:
                break;
        }
    }

    private processServerQueries(content: any) {
        try {
            let queryContent = {};
            if(!content.SERVER_QUERY || content.SERVER_QUERY.length === 0) return queryContent;

            for (let query of content.SERVER_QUERY) {
                queryContent[query] = this.processQuery(query);
            }
            return queryContent;
        } catch (err) {
            this.log.warn(entity, `Could not parse content to process server queries`);
            return false;
        }
    }

    private processQuery(type: string) {
        switch (type) {
            case SERVER_QUERY_TYPE.WSS_SERVER_ID:
                return this.serverId;
                break;
            case SERVER_QUERY_TYPE.WSS_SERVER_IP:
                return ip.address(null, "ipv4");
                break;
            case SERVER_QUERY_TYPE.WSS_SERVER_DETAILS:
                return {
                    serverId: this.serverId,
                    ip: ip.address(null, "ipv4"),
                    restPort: this.rest.getRestPort(),
                    restAddress: this.rest.getRESTApiAddress(),
                    websocketAddress: this.ws.getWSSAddress(),
                    websocketPort: this.ws.getWSSPort(),
                    connectedClients: this.ws.getClientCount()
                };
                break;
            case SERVER_QUERY_TYPE.WSS_SERVER_CLI_COUNT:
                return this.ws.getClientCount();
                break;
            default:
                return null;
                break;
        }
    }
}