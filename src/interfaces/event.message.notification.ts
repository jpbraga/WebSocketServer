import WebSocketServer = require('websocket');

export interface MessageEventNotification {
    sender: WebSocketServer.connection,
    content: any
}