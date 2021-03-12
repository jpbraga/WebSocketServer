import WebSocketServer = require('websocket');

export interface MessageEventNotification {
    type: number,
    sender?: string,
    content: any
}