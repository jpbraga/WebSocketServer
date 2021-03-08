import * as dotenv from "dotenv";
import { Database } from "./database/database";
import { LogService } from './util/log.services';
import { WSServer } from './api/websocket';
import { EventNotification } from "./services/event.notification";
import { RESTApi } from "./api/rest";
import { BusinessLayer } from "./orchestration/business.layer";
import { Environment } from "./util/environment";
import { ENV_VARS } from "./util/consts/env.vars";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

const entity: string = "Initializer";

export class Initializer {

  private log: LogService;
  private initialized: boolean = false;

  constructor(private db: Database,
    private wss: WSServer,
    private rest: RESTApi,
    private bs: BusinessLayer,
    private en: EventNotification) {
    this.log = LogService.getInstnce();
    this.log.info(entity, 'Starting...');
    this.init();
  }

  private async init() {
    try {
      if(parseInt(Environment.getValue(ENV_VARS.SERVER_QUERY, '0')) === 1) {
        this.log.info(entity, 'SERVER_QUERY is enabled!');
      } 
      this.log.info(entity, `The identifier within the JWT TOKEN is set to be: ${Environment.getValue(ENV_VARS.JWT_IDENTIFIER, "uid")}`);
      await this.db.init();
      await this.wss.init();
      await this.rest.init();
      await this.bs.init();

      this.initialized = true;
      this.log.info(entity, 'Started and awaiting requests...');
    } catch (error) {
      this.log.fatal(entity, `An initialization error has occured - ${error.message}`);
      process.exit(-1);
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}