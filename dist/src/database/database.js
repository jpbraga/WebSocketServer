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
exports.Database = void 0;
const redis = require("redis");
const env_vars_1 = require("../util/consts/env.vars");
const environment_1 = require("../util/environment");
const log_services_1 = require("../util/log.services");
const entity = "Database";
class Database {
    constructor() {
        this.client = null;
        this.log = log_services_1.LogService.getInstnce();
        this.host = environment_1.Environment.getValue(env_vars_1.ENV_VARS.REDIS_HOST, "localhost");
        this.port = parseInt(environment_1.Environment.getValue(env_vars_1.ENV_VARS.REDIS_PORT, "6379"));
        this.password = environment_1.Environment.getValue(env_vars_1.ENV_VARS.REDIS_PASSWORD);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    if (!this.port || !this.host)
                        throw new Error("Host and/or port for redis must be informed");
                    this.log.info(entity, `Connecting to the redis cluster/instance at ${this.host}:${this.port}...`);
                    this.client = redis.createClient({
                        port: this.port,
                        host: this.host,
                        password: this.password
                    });
                    this.client.on('connect', () => {
                        this.log.info(entity, `Connected to redis!`);
                        resolve(true);
                    });
                }
                catch (er) {
                    this.log.fatal(entity, er);
                    reject(er);
                }
            });
        });
    }
    insert(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.isInitialized())
                    throw new Error('The redis client was not initialized.');
                try {
                    this.client.set(key, value, (err, reply) => {
                        if (err)
                            throw err;
                        resolve(reply);
                    });
                }
                catch (er) {
                    this.log.error(entity, er);
                    reject(er);
                }
            });
        });
    }
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.isInitialized())
                    throw new Error('The redis client was not initialized.');
                try {
                    this.client.del(key, (err, reply) => {
                        if (err)
                            throw err;
                        resolve(reply);
                    });
                }
                catch (er) {
                    this.log.error(entity, er);
                    reject(er);
                }
            });
        });
    }
    find(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.isInitialized())
                    throw new Error('The redis client was not initialized.');
                try {
                    this.client.get(key, (err, object) => {
                        if (err)
                            throw err;
                        resolve(object);
                    });
                }
                catch (er) {
                    this.log.error(entity, er);
                    reject(er);
                }
            });
        });
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.isInitialized())
                    throw new Error('The redis client was not initialized.');
                try {
                    this.client.sadd([key, value], (err, objects) => {
                        if (err)
                            throw err;
                        resolve(objects);
                    });
                }
                catch (er) {
                    this.log.error(entity, er);
                    reject(er);
                }
            });
        });
    }
    getSet(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.isInitialized())
                    throw new Error('The redis client was not initialized.');
                try {
                    this.client.smembers(key, (err, objects) => {
                        if (err)
                            throw err;
                        resolve(objects);
                    });
                }
                catch (er) {
                    this.log.error(entity, er);
                    reject(er);
                }
            });
        });
    }
    removeSet(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!this.isInitialized())
                    throw new Error('The redis client was not initialized.');
                try {
                    this.client.srem(key, value, (err, objects) => {
                        if (err)
                            throw err;
                        resolve(objects);
                    });
                }
                catch (er) {
                    this.log.error(entity, er);
                    reject(er);
                }
            });
        });
    }
    isInitialized() {
        return (this.client) ? true : false;
    }
}
exports.Database = Database;
