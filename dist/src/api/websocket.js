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
exports.WSServer = void 0;
const WebSocketServer = require("websocket");
const ip = require("ip");
const http = require("http");
const log_services_1 = require("../util/log.services");
const guid_1 = require("../util/guid");
const websocket_event_types_1 = require("./consts/websocket.event.types");
const environment_1 = require("../util/environment");
const env_vars_1 = require("../util/consts/env.vars");
const entity = "WSServer";
const WSS_SRV_PORT = 8080;
const AUTH_TIMEOUT = environment_1.Environment.getValue(env_vars_1.ENV_VARS.AUTH_TIMEOUT, 5000);
class WSServer {
    constructor(authorizer) {
        this.connectionPool = {};
        this.poolCount = 0;
        this.eventListeners = {};
        this.uidKey = environment_1.Environment.getValue(env_vars_1.ENV_VARS.JWT_IDENTIFIER, "uid");
        this.log = log_services_1.LogService.getInstnce();
        this.authorizer = authorizer;
        this.server = http.createServer((request, response) => {
            this.log.info(entity, 'Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info(entity, 'Starting server on port ' + WSS_SRV_PORT);
            this.server.listen(WSS_SRV_PORT);
            this.log.info(entity, 'Initializing webSocket method...');
            this.wsServer = new WebSocketServer.server({
                httpServer: this.server,
                autoAcceptConnections: false,
            });
            this.wsServer.on('request', (request) => {
                if (!this.originIsAllowed(request.origin)) {
                    request.reject();
                    this.log.warn(entity, `Connection from origin ${request.origin} rejected.`);
                    return;
                }
                let connection = request.accept('echo-protocol', request.origin);
                this.log.info(entity, 'Connection accepted.');
                this.log.debug(entity, `Peer ${connection.remoteAddress} connected but its still unauthorized.`);
                this.log.debug(entity, `Setting timeout for peer ${connection.remoteAddress} T-${AUTH_TIMEOUT}.`);
                let timeout = setTimeout(() => {
                    this.log.debug(entity, `Peer ${connection.remoteAddress}: Authorization timed out after ${AUTH_TIMEOUT / 1000} seconds.`);
                    connection.close(WebSocketServer.connection.CLOSE_REASON_POLICY_VIOLATION, `Authorization timed out after ${AUTH_TIMEOUT / 1000} seconds`);
                }, AUTH_TIMEOUT);
                connection.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
                    if (message.type === 'utf8') {
                        let content = (!(message === null || message === void 0 ? void 0 : message.utf8Data)) ? '{}' : message === null || message === void 0 ? void 0 : message.utf8Data;
                        let payload = null;
                        try {
                            payload = JSON.parse(content);
                        }
                        catch (err) {
                            this.log.warn(entity, `Error parsing message from Peer ${connection.remoteAddress} `);
                            connection.close(WebSocketServer.connection.CLOSE_REASON_POLICY_VIOLATION, "Error parsing json");
                            return;
                        }
                        if (parseInt(environment_1.Environment.getValue(env_vars_1.ENV_VARS.SHOW_INCOMMING, '0'))) {
                            this.log.debug(entity, `Received Message: ${message === null || message === void 0 ? void 0 : message.utf8Data}`);
                        }
                        else
                            this.log.debug(entity, `Message received`);
                        let authorize = this.authorize(payload.jwt_auth_token);
                        if (authorize.isAuthorized) {
                            if (!this.connectionPool[authorize[this.uidKey]]) {
                                this.log.debug(entity, `Peer ${connection.remoteAddress} is authorized as ${authorize[this.uidKey]}.`);
                                clearTimeout(timeout);
                                this.notifyEventListeners(websocket_event_types_1.WEBSOCKET_EVENT_TYPES.CONNECTED, authorize[this.uidKey]);
                                this.poolCount++;
                                this.log.info(entity, `${this.poolCount} authorized clients connected`);
                            }
                            this.connectionPool[authorize[this.uidKey]] = connection;
                            if (parseInt(environment_1.Environment.getValue(env_vars_1.ENV_VARS.FWRD_JWT_DECODED, '0'))) {
                                payload.jwt_auth_token_content = {
                                    content: authorize.content
                                };
                            }
                            this.notifyEventListeners(websocket_event_types_1.WEBSOCKET_EVENT_TYPES.MESSAGE, authorize[this.uidKey], payload);
                        }
                        else {
                            if (authorize && authorize[this.uidKey])
                                delete this.connectionPool[authorize[this.uidKey]];
                            this.log.debug(entity, `Peer ${connection.remoteAddress} made an unauthorized request: ${content}.`);
                            clearTimeout(timeout);
                            connection.close(WebSocketServer.connection.CLOSE_REASON_POLICY_VIOLATION, `Property jwt_auth_token missing in the root of the payload`);
                        }
                    }
                }));
                connection.on('close', (reasonCode, description) => {
                    this.log.info(entity, `Peer ${connection.remoteAddress} disconnected.`);
                    this.cleanPool();
                });
            });
            this.log.info(entity, `Server running on:  ws://${ip.address(null, "ipv4")}:${this.server.address()['port']}/`);
        });
    }
    cleanPool() {
        for (let uid in this.connectionPool) {
            if (!this.connectionPool[uid].connected) {
                this.removeFromPool(uid);
            }
        }
    }
    removeFromPool(uid) {
        if (this.connectionPool[uid]) {
            this.notifyEventListeners(websocket_event_types_1.WEBSOCKET_EVENT_TYPES.DISCONNECTED, uid);
            delete this.connectionPool[uid];
            this.poolCount--;
        }
    }
    authorize(token) {
        return this.authorizer.authorize(token, process.env.JWT_SECRET);
    }
    sendBroadcast(content, sender) {
        let log = `Sending a broadcast to ${this.poolCount} client(s).`;
        log = (!sender) ? log : log + " Excluding sender - " + sender;
        this.log.info(entity, log);
        try {
            for (let uid in this.connectionPool) {
                if (!uid || (uid && uid !== sender)) {
                    let connection = this.connectionPool[uid];
                    if (connection.connected)
                        this.sendMessage(uid, content);
                    else
                        this.removeFromPool(uid);
                }
            }
        }
        catch (error) {
            this.log.error(entity, error);
            throw (error);
        }
    }
    sendMessage(uid, content) {
        let connection = this.connectionPool[uid];
        if (connection) {
            this.log.debug(entity, `Sending a single message to ${uid} (${connection.remoteAddress})`);
            connection.sendUTF(JSON.stringify(content));
        }
        else {
            this.log.warn(entity, `No connection found for the provided ${this.uidKey} ${uid}`);
            this.removeFromPool(uid);
        }
    }
    sendMessageToConn(connection, content) {
        this.log.debug(entity, `Sending a single message to Peer (${connection.remoteAddress})`);
        connection.sendUTF(JSON.stringify(content));
    }
    originIsAllowed(origin) {
        this.log.debug(entity, origin);
        return true;
    }
    getWSSAddress() {
        return `ws://${ip.address(null, "ipv4")}:${this.server.address()['port']}`;
    }
    getWSSPort() {
        return this.server.address()['port'];
    }
    getClientCount() {
        return this.poolCount;
    }
    registerEventListener(callback) {
        let guid = guid_1.Guid.generateGuid();
        this.eventListeners[guid] = callback;
        return guid;
    }
    unregisterEventListener(guid) {
        delete this.eventListeners[guid];
    }
    notifyEventListeners(type, sender, content) {
        for (let notification in this.eventListeners) {
            this.eventListeners[notification]({
                sender: sender,
                content: content,
                type: type
            });
        }
    }
}
exports.WSServer = WSServer;
