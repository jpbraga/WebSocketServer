import https = require('https');
import http = require('http');
import { ENV_VARS } from '../util/consts/env.vars';
import { Environment } from '../util/environment';
import { LogService } from "../util/log.services";

const entity: string = 'EventNotification';

export class EventNotification {

    private log: LogService;

    constructor() {
        this.log = LogService.getInstnce();
    }

    public async request(url: string, method: string, content?: any) {
        const resourceURL = new URL(url);
        this.log.debug(entity, `Requesting a ${method} at ${url}`);
        return new Promise((resolve, reject) => {
            if (!url) {
                this.log.error(entity, `The HOST for the ${method} method cannot be null`);
                reject (`The HOST for the ${method} method cannot be null`);
            }
            let req = https.request({
                method: method,
                hostname: resourceURL.hostname,
                path: resourceURL.pathname,
                timeout: Environment.getValue(ENV_VARS.REST_REQUEST_TIMEOUT, 15000),
                headers: {
                    "Content-Type": "application/json"
                }
            }, (res) => {
                resolve(res);
            });
            req.on('error', (e) => {
                reject(e.message);
            });
            if (content) req.write(JSON.stringify(content));
            req.end();
        });
    }
}