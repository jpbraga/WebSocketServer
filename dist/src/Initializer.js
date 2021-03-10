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
exports.Initializer = void 0;
const log_services_1 = require("./util/log.services");
const environment_1 = require("./util/environment");
const env_vars_1 = require("./util/consts/env.vars");
const entity = "Initializer";
class Initializer {
    constructor(db, wss, rest, bs, en) {
        this.db = db;
        this.wss = wss;
        this.rest = rest;
        this.bs = bs;
        this.en = en;
        this.initialized = false;
        this.log = log_services_1.LogService.getInstnce();
        this.log.info(entity, 'Starting...');
        this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (parseInt(environment_1.Environment.getValue(env_vars_1.ENV_VARS.SERVER_QUERY, '0')) === 1) {
                    this.log.info(entity, 'SERVER_QUERY is enabled!');
                }
                this.log.info(entity, `The identifier within the JWT TOKEN is set to be: ${environment_1.Environment.getValue(env_vars_1.ENV_VARS.JWT_IDENTIFIER, "uid")}`);
                yield this.db.init();
                yield this.wss.init();
                yield this.rest.init();
                yield this.bs.init();
                this.initialized = true;
                this.log.info(entity, 'Started and awaiting requests...');
            }
            catch (error) {
                this.log.fatal(entity, `An initialization error has occured - ${error.message}`);
                process.exit(-1);
            }
        });
    }
    isInitialized() {
        return this.initialized;
    }
}
exports.Initializer = Initializer;
