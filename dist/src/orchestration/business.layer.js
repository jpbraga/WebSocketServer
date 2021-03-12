"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessLayer = void 0;
const log_services_1 = require("../util/log.services");
const websocket_event_types_1 = require("../api/consts/websocket.event.types");
const rest_event_types_1 = require("../api/consts/rest.event.types");
const environment_1 = require("../util/environment");
const env_vars_1 = require("../util/consts/env.vars");
const server_queries_1 = require("./consts/server.queries");
const ip = require("ip");
const entity = "BusinessLayer";
const REDIS_SERVERS_LIST = "SERVERS";
class BusinessLayer {
    constructor(db, en, ws, rest, serverId) {
        this.db = db;
        this.en = en;
        this.ws = ws;
        this.rest = rest;
        this.serverId = serverId;
        this.uidKey = environment_1.Environment.getValue(env_vars_1.ENV_VARS.JWT_IDENTIFIER, "uid");
        this.podName = environment_1.Environment.getValue(env_vars_1.ENV_VARS.POD_NAME);
        this.namespace = environment_1.Environment.getValue(env_vars_1.ENV_VARS.POD_NAMESPACE);
        this.log = log_services_1.LogService.getInstnce();
        this.log.info(entity, `Server reference id is ${this.serverId}`);
        this.log.info(entity, `The pod name for the server is ${this.podName}`);
        this.log.info(entity, `The namespace for the server within the cluster is ${this.namespace}`);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.ws.registerEventListener((event) => __awaiter(this, void 0, void 0, function* () {
                this.processWSEvents(event.type, event.content, event.sender);
            }));
            this.log.debug(entity, 'WebSocket events listener registered!');
            this.rest.registerEventListener((event) => __awaiter(this, void 0, void 0, function* () {
                const payload = (!event.content.payload) ? '{}' : event.content.payload;
                this.processRESTApiEvents(event.type, JSON.parse(payload), event.content[this.uidKey], event.content.res);
            }));
            this.log.debug(entity, 'RESTApi event listener registered!');
            yield this.db.set(REDIS_SERVERS_LIST, JSON.stringify({
                serverId: this.serverId,
                address: this.rest.getRESTApiAddress(),
                podName: this.podName,
                namespace: this.namespace
            }));
            this.log.debug(entity, `Server ${this.serverId} registered in Redis`);
            this.log.info(entity, 'Business layer ready!');
        });
    }
    processWSEvents(type, content, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            let payload = {
                timestamp: Date.now()
            };
            switch (type) {
                case websocket_event_types_1.WEBSOCKET_EVENT_TYPES.CONNECTED:
                    this.db.insert(sender, this.rest.getRESTApiAddress());
                    this.db.set(this.serverId, sender);
                    yield this.en.request(environment_1.Environment.getValue(env_vars_1.ENV_VARS.EVENT_CONNECTED_URL, null), 'POST', content);
                    break;
                case websocket_event_types_1.WEBSOCKET_EVENT_TYPES.DISCONNECTED:
                    this.log.info(entity, `Request for disconnection of the ${this.uidKey}:${sender} received - ${content.reason}`);
                    this.ws.disconnectClient(sender, content.reason);
                    this.db.delete(sender);
                    this.db.removeSet(this.serverId, sender);
                    payload['users'] = [sender];
                    yield this.en.request(environment_1.Environment.getValue(env_vars_1.ENV_VARS.EVENT_DISCONNECTED_URL, null), 'POST', payload);
                    break;
                case websocket_event_types_1.WEBSOCKET_EVENT_TYPES.MESSAGE:
                    if (parseInt(environment_1.Environment.getValue(env_vars_1.ENV_VARS.SERVER_QUERY, '0')) === 1) {
                        const queryContent = this.processServerQueries(content);
                        if (queryContent) {
                            this.ws.sendMessage(sender, JSON.stringify(queryContent));
                            return;
                        }
                    }
                    payload["data"] = content;
                    payload[this.uidKey] = sender;
                    yield this.en.request(environment_1.Environment.getValue(env_vars_1.ENV_VARS.EVENT_MESSAGE_URL, null), 'POST', payload);
                    if (parseInt(environment_1.Environment.getValue(env_vars_1.ENV_VARS.SHOW_OUTGOING, '0'))) {
                        this.log.debug(entity, `Content sent: ${JSON.stringify(payload)}`);
                    }
                    break;
                default:
                    break;
            }
        });
    }
    processRESTApiEvents(type, content, sender, res) {
        switch (type) {
            case rest_event_types_1.REST_EVENT_TYPES.BROADCAST:
                this.ws.sendBroadcast(JSON.stringify({ payload: content }), sender);
                break;
            case rest_event_types_1.REST_EVENT_TYPES.SEND_MESSAGE_REQUEST:
                this.ws.sendMessage(sender, JSON.stringify({ payload: content }));
                break;
            case rest_event_types_1.REST_EVENT_TYPES.DISCONNECT_REQUEST:
                this.ws.disconnectClient(content.uid, content.reason);
                break;
            case rest_event_types_1.REST_EVENT_TYPES.PROBE:
                res.status(200).send(this.processQuery(server_queries_1.SERVER_QUERY_TYPE.WSS_SERVER_DETAILS));
                break;
            default:
                break;
        }
    }
    processServerQueries(content) {
        try {
            let queryContent = {};
            if (!content.SERVER_QUERY || content.SERVER_QUERY.length === 0)
                return null;
            for (let query of content.SERVER_QUERY) {
                queryContent[query] = this.processQuery(query);
            }
            return queryContent;
        }
        catch (err) {
            this.log.warn(entity, `Could not parse content to process server queries`);
            return false;
        }
    }
    processQuery(type) {
        switch (type) {
            case server_queries_1.SERVER_QUERY_TYPE.WSS_SERVER_ID:
                return this.serverId;
                break;
            case server_queries_1.SERVER_QUERY_TYPE.WSS_SERVER_IP:
                return ip.address(null, "ipv4");
                break;
            case server_queries_1.SERVER_QUERY_TYPE.WSS_SERVER_POD_DETAILS:
                return {
                    podName: environment_1.Environment.getValue(env_vars_1.ENV_VARS.POD_NAME, null),
                    namespace: environment_1.Environment.getValue(env_vars_1.ENV_VARS.POD_NAMESPACE, null),
                    ip: ip.address(null, "ipv4"),
                };
                break;
            case server_queries_1.SERVER_QUERY_TYPE.WSS_SERVER_DETAILS:
                return {
                    podName: environment_1.Environment.getValue(env_vars_1.ENV_VARS.POD_NAME, null),
                    namespace: environment_1.Environment.getValue(env_vars_1.ENV_VARS.POD_NAMESPACE, null),
                    serverId: this.serverId,
                    ip: ip.address(null, "ipv4"),
                    restPort: this.rest.getRestPort(),
                    restAddress: this.rest.getRESTApiAddress(),
                    websocketAddress: this.ws.getWSSAddress(),
                    websocketPort: this.ws.getWSSPort(),
                    connectedClients: this.ws.getClientCount()
                };
                break;
            case server_queries_1.SERVER_QUERY_TYPE.WSS_SERVER_CLI_COUNT:
                return this.ws.getClientCount();
                break;
            default:
                return null;
                break;
        }
    }
    probe() {
        return this.processQuery(server_queries_1.SERVER_QUERY_TYPE.WSS_SERVER_DETAILS);
    }
}
exports.BusinessLayer = BusinessLayer;
