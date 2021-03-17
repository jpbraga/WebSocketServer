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

    private typedRequest(request: any, resourceURL: URL, method: string, content?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            let req = request.request({
                method: method,
                port: resourceURL.port,
                hostname: resourceURL.hostname,
                path: resourceURL.pathname,
                timeout: Environment.getValue(ENV_VARS.REST_REQUEST_TIMEOUT, 15000),
                headers: {
                    "Content-Type": "application/json"
                }
            }, (res) => {
                res.resume();
                res.on('end', () => {
                    if (!res.complete){
                        const errMsg = 'The connection was terminated while the message was still being sent';
                        this.log.error(entity, errMsg);
                        reject(errMsg);
                    }
                });

                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    if(parseInt(Environment.getValue(ENV_VARS.SHOW_INCOMMING, '0'))) {
                        this.log.debug(entity, `Incomming content for the ${method} method at ${resourceURL.hostname}:${resourceURL.port}${resourceURL.pathname}`);
                        this.log.debug(entity, chunk);
                    }
                    resolve(chunk);
                });
            });

            req.on('error', (e) => {
                this.log.error(entity, `Error requesting a ${method} at ${resourceURL.hostname}:${resourceURL.port}${resourceURL.pathname} - ${e}`);
                reject(e.message);
            });
            if (content) req.write(JSON.stringify(content));
            req.end();
        });
    }

    public async request(url: string, method: string, content?: any) {
        if (!url) {
            this.log.error(entity, `The HOST for the ${method} method cannot be null`);
            throw new Error(`The HOST for the ${method} method cannot be null`);
        }
        const resourceURL = new URL(url);
        this.log.debug(entity, `Requesting a ${method} at ${url}`);
        switch (resourceURL.protocol) {
            case "http:":
                this.log.info(entity, `Request to a insecure address`);
                return await this.typedRequest(http, resourceURL, method, content);
                break;
            case "https:":
                this.log.info(entity, `Request to a secure address`);
                return await this.typedRequest(https, resourceURL, method, content);
                break;
            default:
                throw new Error(`Protocol (${resourceURL.protocol}) not identified in the provided url: ${url}`);
                break;
        }
    }
}