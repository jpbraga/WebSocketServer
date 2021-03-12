import * as dotenv from "dotenv";
import { LogService } from './util/log.services';
import { RESTApi } from "./api/rest";
import { BusinessLayer } from "./orchestration/business.layer";
import { Environment } from "./util/environment";
import { ENV_VARS } from "./util/consts/env.vars";

const entity: string = "Initializer";

export class Initializer {

  private log: LogService;
  private initialized: boolean = false;

  constructor(
    private rest: RESTApi,
    private bs: BusinessLayer) {
    this.log = LogService.getInstnce();
    this.log.info(entity, 'Starting...');
    this.init();
  }

  private async init() {
    try {
      this.log.info(entity, `The identifier within the JWT TOKEN is set to be: ${Environment.getValue(ENV_VARS.JWT_IDENTIFIER, "uid")}`);
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