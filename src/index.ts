import * as dotenv from "dotenv";
import { Database } from "./database/database";
import { WSServer } from './api/websocket';
import { EventNotification } from "./services/event.notification";
import { Initializer } from "./Initializer";
import { JWTAuthorizer } from "./authorizer/authorizer";
import { RESTApi } from "./api/rest";
import { BusinessLayer } from "./orchestration/business.layer";
import { Guid } from "./util/guid";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

//Initialization
let serverId:string = Guid.generateGuid();
let jwtAuthorizer:JWTAuthorizer = new JWTAuthorizer();
let db: Database = new Database();
let rest:RESTApi = new RESTApi(serverId);
let en: EventNotification = new EventNotification();
let wss: WSServer = new WSServer(jwtAuthorizer);
let bs:BusinessLayer = new BusinessLayer(db,en, wss, rest, serverId);
let server: Initializer = new Initializer(db, wss, rest, bs, en);