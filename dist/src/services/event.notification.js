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
exports.EventNotification = void 0;
const https = require("https");
const env_vars_1 = require("../util/consts/env.vars");
const environment_1 = require("../util/environment");
const log_services_1 = require("../util/log.services");
const entity = 'EventNotification';
class EventNotification {
    constructor() {
        this.log = log_services_1.LogService.getInstnce();
    }
    request(url, method, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const resourceURL = new URL(url);
            this.log.debug(entity, `Requesting a ${method} at ${url}`);
            return new Promise((resolve, reject) => {
                if (!url) {
                    this.log.error(entity, `The HOST for the ${method} method cannot be null`);
                    reject(`The HOST for the ${method} method cannot be null`);
                }
                let req = https.request({
                    method: method,
                    hostname: resourceURL.hostname,
                    path: resourceURL.pathname,
                    timeout: environment_1.Environment.getValue(env_vars_1.ENV_VARS.REST_REQUEST_TIMEOUT, 15000),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }, (res) => {
                    resolve(res);
                });
                req.on('error', (e) => {
                    reject(e.message);
                });
                if (content)
                    req.write(JSON.stringify(content));
                req.end();
            });
        });
    }
}
exports.EventNotification = EventNotification;
