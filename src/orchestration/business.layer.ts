import express = require('express');
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
import { ProbeData } from "../interfaces/rest.probe.data";

const entity: string = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";

export class BusinessLayer {

    private log: LogService;
    private uidKey: string = Environment.getValue(ENV_VARS.JWT_IDENTIFIER, "uid");
    private podName: string = Environment.getValue(ENV_VARS.POD_NAME);
    private namespace: string = Environment.getValue(ENV_VARS.POD_NAMESPACE);
    constructor(private db: Database,
        private en: EventNotification,
        private ws: WSServer,
        private rest: RESTApi,
        private serverId: string) {
        this.log = LogService.getInstnce();
        this.log.info(entity, `Server reference id is ${this.serverId}`);
        this.log.info(entity, `The pod name for the server is ${this.podName}`)
        this.log.info(entity, `The namespace for the server within the cluster is ${this.namespace}`)
    }

    public async init() {
        this.ws.registerEventListener(async (event: MessageEventNotification) => {
            this.processWSEvents(event.type, event.content, event.sender);
        });
        this.log.debug(entity, 'WebSocket events listener registered!');

        this.rest.registerEventListener(async (event: MessageEventNotification) => {
            const payload = (!event.content.payload) ? '{}' : event.content.payload
            this.processRESTApiEvents(event.type, JSON.parse(payload), event.content[this.uidKey], event.content.res);
        });
        this.log.debug(entity, 'RESTApi event listener registered!');

        await this.db.set(REDIS_SERVERS_LIST, JSON.stringify({
            serverId: this.serverId,
            address: this.rest.getRESTApiAddress(),
            podName: this.podName,
            namespace: this.namespace
        }));
        this.log.debug(entity, `Server ${this.serverId} registered in Redis`);

        this.log.info(entity, 'Business layer ready!');
    }

    private async processWSEvents(type: number, content?: any, sender?: string) {
        let payload = {
            timestamp: Date.now()
        }
        switch (type) {
            case WEBSOCKET_EVENT_TYPES.CONNECTED:
                this.db.insert(sender, this.rest.getRESTApiAddress());
                this.db.set(this.serverId, sender);
                if (parseInt(Environment.getValue(ENV_VARS.SHOW_OUTGOING, '0'))) {
                    this.log.debug(entity, `Content sent: ${JSON.stringify(content)}`);
                }
                await this.en.request(
                    Environment.getValue(ENV_VARS.EVENT_CONNECTED_URL, null),
                    'POST',
                    content);

                break;
            case WEBSOCKET_EVENT_TYPES.DISCONNECTED:
                this.db.delete(sender);
                this.db.removeSet(this.serverId, sender);
                payload['users'] = [sender];
                if (parseInt(Environment.getValue(ENV_VARS.SHOW_OUTGOING, '0'))) {
                    this.log.debug(entity, `Content sent: ${JSON.stringify(payload)}`);
                }
                await this.en.request(
                    Environment.getValue(ENV_VARS.EVENT_DISCONNECTED_URL, null),
                    'POST',
                    payload);

                break;
            case WEBSOCKET_EVENT_TYPES.MESSAGE:
                if (parseInt(Environment.getValue(ENV_VARS.SERVER_QUERY, '0')) === 1) {
                    const queryContent = this.processServerQueries(content);
                    if (queryContent) {
                        this.ws.sendMessage(sender, JSON.stringify(queryContent));
                        return;
                    }
                }
                payload["data"] = content;
                payload[this.uidKey] = sender;
                if (parseInt(Environment.getValue(ENV_VARS.SHOW_OUTGOING, '0'))) {
                    this.log.debug(entity, `Content sent: ${JSON.stringify(payload)}`);
                }
                await this.en.request(
                    Environment.getValue(ENV_VARS.EVENT_MESSAGE_URL, null) + `/${sender}`,
                    'POST',
                    payload);

                break;

            default:
                break;
        }
    }

    private processRESTApiEvents(type: number, content: any, sender?: string, res?: express.Response) {
        switch (type) {
            case REST_EVENT_TYPES.BROADCAST:
                this.ws.sendBroadcast(JSON.stringify({ payload: content }), sender);
                break;
            case REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                this.ws.sendMessage(sender, JSON.stringify({ payload: content }));
                break;
            case REST_EVENT_TYPES.DISCONNECT_REQUEST:
                this.log.info(entity, `Request for disconnection of the ${this.uidKey}:${sender} received - ${content.reason}`);
                this.ws.disconnectClient(sender, content.reason);
                break;
            case REST_EVENT_TYPES.PROBE:
                res.status(200).send(this.processQuery(SERVER_QUERY_TYPE.WSS_SERVER_DETAILS));
                break;

            default:
                break;
        }
    }

    private processServerQueries(content: any) {
        try {
            let queryContent = {};
            if (!content.SERVER_QUERY || content.SERVER_QUERY.length === 0) return null;
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
            case SERVER_QUERY_TYPE.WSS_SERVER_POD_DETAILS:
                return {
                    podName: Environment.getValue(ENV_VARS.POD_NAME, null),
                    namespace: Environment.getValue(ENV_VARS.POD_NAMESPACE, null),
                    ip: ip.address(null, "ipv4"),
                };
                break;
            case SERVER_QUERY_TYPE.WSS_SERVER_DETAILS:
                return {
                    podName: Environment.getValue(ENV_VARS.POD_NAME, null),
                    namespace: Environment.getValue(ENV_VARS.POD_NAMESPACE, null),
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

    private probe(): ProbeData {
        return <ProbeData>this.processQuery(SERVER_QUERY_TYPE.WSS_SERVER_DETAILS);
    }
}