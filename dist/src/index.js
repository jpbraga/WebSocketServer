"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database/database");
const websocket_1 = require("./api/websocket");
const event_notification_1 = require("./services/event.notification");
const Initializer_1 = require("./Initializer");
const authorizer_1 = require("./authorizer/authorizer");
const rest_1 = require("./api/rest");
const business_layer_1 = require("./orchestration/business.layer");
const guid_1 = require("./util/guid");
let serverId = guid_1.Guid.generateGuid();
let jwtAuthorizer = new authorizer_1.JWTAuthorizer();
let db = new database_1.Database();
let rest = new rest_1.RESTApi(serverId);
let en = new event_notification_1.EventNotification();
let wss = new websocket_1.WSServer(jwtAuthorizer);
let bs = new business_layer_1.BusinessLayer(db, en, wss, rest, serverId);
let server = new Initializer_1.Initializer(db, wss, rest, bs, en);