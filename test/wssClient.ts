import W3CWebSocket = require('websocket');
import { ClientConnectionCallback } from './interfaces/client.connection.callback';
export class WSSClient {
    private client: W3CWebSocket.w3cwebsocket;

    private callback:Function = null;
    private connCallback:ClientConnectionCallback = null;

    constructor() { }

    public connect(ip:string, port:string, path:string = "") {
        const address = `ws://${ip}:${port}${path}`;
        console.log(address)
        this.client = new W3CWebSocket.w3cwebsocket(address, 'echo-protocol');

        this.client.onerror = (error) => {
            console.error(error.message);
            if(this.connCallback) this.connCallback({
                code: -1,
                content:error.message
            });
        };

        this.client.onopen = () => {
            if(this.connCallback) this.connCallback({
                code: 0
            });
        };

        this.client.onclose = (event) => {
            if(this.connCallback) this.connCallback({
                code: 1,
                content: JSON.stringify(event)
            });
        };

        this.client.onmessage = (e) => {
            if (typeof e.data === 'string') {
                if(this.callback) this.callback(e.data);
            }
        };
    }

    public sendMessage(content: string) {
        if (this.client?.readyState === this.client?.OPEN) this.client.send(content);
    }

    public registerMessageListener (callback:Function) {
        this.callback = callback;
    }

    public registerConnectionListener (callback:ClientConnectionCallback) {
        this.connCallback = callback;
    }

}
