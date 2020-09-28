import WebSocketServer = require('websocket');
import ip = require('ip');
import http = require('http');
import { LogService } from '../util/log.services';
import { EventResponseInterface } from '../interfaces/event.response';
import { EventResponseRegisterInterface } from '../interfaces/event.register.response';
import { EventResponseRegisterErrorInterface } from '../interfaces/event.register.error.response';
import { Guid } from '../util/guid';
import { EventMessageCallback } from '../interfaces/event.message.callback';

const entity: string = "WSServer";

export class WSServer {

    private server: http.Server;
    private log: LogService;
    private wsServer: WebSocketServer.server;
    private connectionPool: Array<WebSocketServer.connection> = [];
    private messageListeners = {};

    constructor() {
        this.log = LogService.getInstnce();
        this.server = http.createServer((request, response) => {
            this.log.info(entity, 'Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });
    }

    public async init() {
        this.log.info(entity, 'Starting server on port ' + process.env.WSS_SRV_PORT);
        this.server.listen(process.env.WSS_SRV_PORT);

        this.log.info(entity, 'Initializing webSocket method...');
        this.wsServer = new WebSocketServer.server({
            httpServer: this.server,
            autoAcceptConnections: false
        });

        this.wsServer.on('request', (request) => {
            if (!this.originIsAllowed(request.origin)) {
                request.reject();
                this.log.warn(entity, `Connection from origin ${request.origin} rejected.`);
                return;
            }

            let connection = request.accept('echo-protocol', request.origin);
            this.log.info(entity, 'Connection accepted.');
            this.log.debug(entity, `Peer ${connection.remoteAddress} connected.`);

            connection.on('message', async (message) => {
                if (message.type === 'utf8') {
                    this.log.debug(entity, `Received Message: ${message.utf8Data}`);
                    this.notifyMessageListeners(connection, message.utf8Data);
                    //this.sendMessage(connection, await this.executeCommand(message));
                }
            });
            connection.on('close', (reasonCode, description) => {
                this.log.info(entity, `Peer ${connection.remoteAddress} disconnected.`);
                this.connectionPool.splice(this.connectionPool.indexOf(connection), 1);
                this.log.info(entity, `${this.connectionPool.length} client(s) left`);
            });

            this.connectionPool.push(connection);
            this.log.info(entity, `${this.connectionPool.length} clients connected`);
        });
        this.log.info(entity, `Server running on:  ws://${ip.address(null, "ipv4")}:${this.server.address()['port']}/`);
    }

    public sendBroadcast(content: EventResponseInterface | EventResponseRegisterInterface | EventResponseRegisterErrorInterface) {
        this.log.info(entity, `Sending a broadcast to ${this.connectionPool.length} client(s).`);
        try {
            for (let conn of this.connectionPool) this.sendMessage(conn, content);
        } catch (error) {
            this.log.error(entity, error);
            throw (error);
        }
    }

    public sendMessage(connection: WebSocketServer.connection, content: EventResponseInterface | EventResponseRegisterInterface | EventResponseRegisterErrorInterface) {
        this.log.debug(entity, `Sending a single message to ${connection.remoteAddress}`);
        connection.sendUTF(JSON.stringify(content));
    }

    private originIsAllowed(origin): boolean {
        this.log.debug(entity, origin);
        // put logic here to detect whether the specified origin is allowed.
        return true;
    }

    public registerMessageListener (callback:EventMessageCallback):string {
        let guid:string  = Guid.generateGuid();
        this.messageListeners[guid] = callback;
        return guid;
    }

    public unregisterMessageListener (guid:string): void {
       delete this.messageListeners[guid];
    }

    private notifyMessageListeners(sender:WebSocketServer.connection, content:any): void {
        for ( let notification in this.messageListeners) {
            this.messageListeners[notification]({
                sender:sender,
                content:content
            });
        }
    }
}