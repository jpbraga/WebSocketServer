import redis = require('redis');
import { ENV_VARS } from '../util/consts/env.vars';
import { Environment } from '../util/environment';
import { LogService } from '../util/log.services';
const entity: string = "Database";

export class Database {
    private client = null;
    private log: LogService;
    private host: string;
    private port: number; //6379
    private password: string;

    constructor() {
        this.log = LogService.getInstnce();
        this.host = Environment.getValue(ENV_VARS.REDIS_HOST, "localhost");
        this.port = parseInt(Environment.getValue(ENV_VARS.REDIS_PORT, "6379"));
        this.password = Environment.getValue(ENV_VARS.REDIS_PASSWORD)
    }

    public async init() {
        return new Promise((resolve, reject) => {
            try {
                if (!this.port || !this.host) throw new Error("Host and/or port for redis must be informed");
                this.log.info(entity, `Connecting to the redis cluster/instance at ${this.host}:${this.port}...`)
                this.client = redis.createClient({ 
                    port: this.port, 
                    host: this.host, 
                    password: this.password 
                });

                this.client.on('connect', () => {
                    this.log.info(entity, `Connected to redis!`);
                    resolve(true);
                });

            } catch (er) {
                this.log.fatal(entity, er);
                reject(er);
            }
        })
    }

    public async insert(key: string, value: any) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) throw new Error('The redis client was not initialized.');
            try {
                this.client.set(key, value, (err, reply) => {
                    if (err) throw err;
                    resolve(reply);
                });
            } catch (er) {
                this.log.error(entity, er);
                reject(er);
            }
        })
    }

    public async delete(key: string) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) throw new Error('The redis client was not initialized.');
            try {
                this.client.del(key, (err, reply) => {
                    if (err) throw err;
                    resolve(reply);
                });
            } catch (er) {
                this.log.error(entity, er);
                reject(er);
            }
        })
    }

    public async find(key: string) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) throw new Error('The redis client was not initialized.');
            try {
                this.client.get(key, (err, object) => {
                    if (err) throw err;
                    resolve(object);
                });
            } catch (er) {
                this.log.error(entity, er);
                reject(er);
            }
        })
    }

    public async set(key: string, value: any) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) throw new Error('The redis client was not initialized.');
            try {
                this.client.sadd([key, value], (err, objects) => {
                    if (err) throw err;
                    resolve(objects);
                });
            } catch (er) {
                this.log.error(entity, er);
                reject(er);
            }
        })
    }

    public async getSet(key: string) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) throw new Error('The redis client was not initialized.');
            try {
                this.client.smembers(key, (err, objects) => {
                    if (err) throw err;
                    resolve(objects);
                });
            } catch (er) {
                this.log.error(entity, er);
                reject(er);
            }
        })
    }

    public async removeSet(key: string, value: any) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized()) throw new Error('The redis client was not initialized.');
            try {
                this.client.srem(key, value, (err, objects) => {
                    if (err) throw err;
                    resolve(objects);
                });
            } catch (er) {
                this.log.error(entity, er);
                reject(er);
            }
        })
    }

    private isInitialized(): boolean {
        return (this.client) ? true : false;
    }
}


