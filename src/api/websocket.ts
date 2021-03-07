import WebSocketServer = require('websocket');
import ip = require('ip');
import http = require('http');
import { LogService } from '../util/log.services';
import { Guid } from '../util/guid';
import { WEBSOCKET_EVENT_TYPES } from './consts/websocket.event.types';
import { Authorizer } from '../interfaces/authorizer';
import { Authorize } from '../interfaces/authorizer.authorize';
import { MessageInterface } from '../interfaces/message';
import { Environment } from '../util/environment';
import { ENV_VARS } from '../util/consts/env.vars';
import { EventMessageCallback } from '../interfaces/event.message.callback';

const entity: string = "WSServer";
const WSS_SRV_PORT = 8080;
const AUTH_TIMEOUT = Environment.getValue(ENV_VARS.AUTH_TIMEOUT, 5000);

export class WSServer {

    private server: http.Server;
    private log: LogService;
    private wsServer: WebSocketServer.server;
    //private connectionPool: Array<WebSocketServer.connection> = [];
    private connectionPool = {};
    private poolCount = 0;
    private eventListeners = {};
    private authorizer: Authorizer;

    constructor(authorizer: Authorizer) {
        this.log = LogService.getInstnce();
        this.authorizer = authorizer;
        this.server = http.createServer((request, response) => {
            this.log.info(entity, 'Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });
    }

    public async init() {
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

            connection.on('message', async (message) => {
                if (message.type === 'utf8') {
                    let content: string = (!message?.utf8Data) ? '{}' : message?.utf8Data;
                    let payload = null;
                    try {
                        payload = JSON.parse(content);
                    } catch (err) {
                        this.log.warn(entity, `Error parsing message from Peer ${connection.remoteAddress} `);
                        connection.close(WebSocketServer.connection.CLOSE_REASON_POLICY_VIOLATION, "Error parsing json");
                        return;
                    }

                    this.log.debug(entity, `Received Message: ${message?.utf8Data}`);
                    let authorize = this.authorize(payload.jwt_auth_token);
                    if (authorize.isAuthorized) {
                        if (!this.connectionPool[authorize.uid]) {
                            this.log.debug(entity, `Peer ${connection.remoteAddress} is authorized as ${authorize.uid}.`);
                            clearTimeout(timeout);
                            this.notifyEventListeners(WEBSOCKET_EVENT_TYPES.CONNECTED, authorize.uid);
                            this.poolCount++;
                            this.log.info(entity, `${this.poolCount} authorized clients connected`);
                        }
                        this.connectionPool[authorize.uid] = connection;
                        payload.jwt_auth_token_content = {
                            uid: authorize.uid,
                            content: authorize.content
                        }
                        this.notifyEventListeners(WEBSOCKET_EVENT_TYPES.MESSAGE, authorize.uid, payload);
                    } else {
                        delete this.connectionPool[authorize?.uid];
                        this.log.debug(entity, `Peer ${connection.remoteAddress} made an unauthorized request: ${content}.`);
                        clearTimeout(timeout);
                        connection.close(WebSocketServer.connection.CLOSE_REASON_POLICY_VIOLATION, `Property jwt_auth_token missing in the root of the payload`);
                    }
                }
            })
            connection.on('close', (reasonCode, description) => {
                this.log.info(entity, `Peer ${connection.remoteAddress} disconnected.`);
                this.cleanPool();
            });
        });
        this.log.info(entity, `Server running on:  ws://${ip.address(null, "ipv4")}:${this.server.address()['port']}/`);
    }

    private cleanPool() {
        for (let uid in this.connectionPool) {
            if (!(<WebSocketServer.connection>this.connectionPool[uid]).connected) {
                this.removeFromPool(uid);
            }
        }
    }

    private removeFromPool(uid) {
        if (this.connectionPool[uid]) {
            this.notifyEventListeners(WEBSOCKET_EVENT_TYPES.DISCONNECTED, uid);
            delete this.connectionPool[uid];
            this.poolCount--;
        }
    }

    private authorize(token): Authorize {
        return this.authorizer.authorize(token, process.env.JWT_SECRET);
    }

    public sendBroadcast(content: any, sender?:string) {
        let log = `Sending a broadcast to ${this.poolCount} client(s).`;
        log = (!sender)?log:log + " Excluding sender - " + sender;
        this.log.info(entity, log);
        try {
            for (let uid in this.connectionPool) {
                if(!uid || (uid && uid !== sender)) {
                    let connection: WebSocketServer.connection = this.connectionPool[uid];
                    if (connection.connected) this.sendMessage(uid, content);
                    else this.removeFromPool(uid);
                }
            }
        } catch (error) {
            this.log.error(entity, error);
            throw (error);
        }
    }

    public sendMessage(uid: string, content: any) {
        let connection = this.connectionPool[uid];
        if (connection) {
            this.log.debug(entity, `Sending a single message to ${uid} (${connection.remoteAddress})`);
            connection.sendUTF(JSON.stringify(content));
        } else {
            this.log.warn(entity, `No connection found for the provided uid ${uid}`);
            this.removeFromPool(uid);
        }
    }

    public sendMessageToConn(connection: WebSocketServer.connection, content: MessageInterface) {
        this.log.debug(entity, `Sending a single message to Peer (${connection.remoteAddress})`);
        connection.sendUTF(JSON.stringify(content));
    }

    private originIsAllowed(origin): boolean {
        this.log.debug(entity, origin);
        // put logic here to detect whether the specified origin is allowed.
        return true;
    }

    public getWSSAddress():string {
        return `ws://${ip.address(null, "ipv4")}:${this.server.address()['port']}`;
    }

    public getWSSPort():number {
        return this.server.address()['port'];
    }

    public getClientCount (): number {
        return this.poolCount;
    }

    public registerEventListener(callback: EventMessageCallback): string {
        let guid: string = Guid.generateGuid();
        this.eventListeners[guid] = callback;
        return guid;
    }

    public unregisterEventListener(guid: string): void {
        delete this.eventListeners[guid];
    }

    private notifyEventListeners(type: number, sender: string, content?: any): void {
        for (let notification in this.eventListeners) {
            this.eventListeners[notification]({
                sender: sender,
                content: content,
                type: type
            });
        }
    }
}