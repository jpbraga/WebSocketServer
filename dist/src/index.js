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
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const database_1 = require("./database/database");
const websocket_1 = require("./api/websocket");
const event_notification_1 = require("./services/event.notification");
const Initializer_1 = require("./Initializer");
const authorizer_1 = require("./authorizer/authorizer");
const rest_1 = require("./api/rest");
const business_layer_1 = require("./orchestration/business.layer");
const guid_1 = require("./util/guid");
const result = dotenv.config();
if (result.error) {
    throw result.error;
}
let serverId = guid_1.Guid.generateGuid();
let jwtAuthorizer = new authorizer_1.JWTAuthorizer();
let db = new database_1.Database();
let rest = new rest_1.RESTApi(serverId);
let en = new event_notification_1.EventNotification();
let wss = new websocket_1.WSServer(jwtAuthorizer);
let bs = new business_layer_1.BusinessLayer(db, en, wss, rest, serverId);
let server = new Initializer_1.Initializer(db, wss, rest, bs, en);
