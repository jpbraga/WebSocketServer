import * as dotenv from "dotenv";
import { Database } from "./database/database";
import { WSServer } from './api/websocket';
import { EventAlarm } from "./services/event.alarm";
import jsonschema = require('jsonschema');
import { BusinessLayer } from "./orchestration/business.layer";
import { Initializer } from "./Initializer";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

//Initialization
let db: Database = new Database();
let ea: EventAlarm = new EventAlarm();
let wss: WSServer = new WSServer();
let bl: BusinessLayer = new BusinessLayer(db, ea, wss, new jsonschema.Validator());
let server: Initializer = new Initializer(db, wss, ea, bl);