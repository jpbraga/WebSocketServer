"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogService = void 0;
const SimpleNodeLogger = require("simple-node-logger");
class LogService {
    constructor() {
        let opts = {
            timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
            level: (!process.env.LOG_LEVEL) ? 'debug' : process.env.LOG_LEVEL
        };
        this.log = SimpleNodeLogger.createSimpleLogger(opts);
    }
    static getInstnce() {
        if (!this._selfInstance)
            this._selfInstance = new LogService();
        return this._selfInstance;
    }
    info(entity, content, params) {
        this.log.info(entity, " - ", content);
    }
    warn(entity, content, params) {
        this.log.warn(entity, " - ", content);
    }
    fatal(entity, content, params) {
        this.log.fatal(entity, " - ", content);
    }
    debug(entity, content, params) {
        this.log.debug(entity, " - ", content);
    }
    error(entity, content, params) {
        this.log.error(entity, " - ", content);
    }
}
exports.LogService = LogService;
LogService._selfInstance = null;
