"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const dotenv = __importStar(require("dotenv"));
const log_services_1 = require("./util/log.services");
const environment_1 = require("./util/environment");
const env_vars_1 = require("./util/consts/env.vars");
const result = dotenv.config();
if (result.error) {
    throw result.error;
}
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
