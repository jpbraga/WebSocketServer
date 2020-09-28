import * as dotenv from "dotenv";
import { Database } from "./database/database";
import { LogService } from './util/log.services';
import { WSServer } from './api/websocket';
import { EventAlarm } from "./services/event.alarm";
import { BusinessLayer } from "./orchestration/business.layer";
import { Guid } from "./util/guid";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

const entity: string = "RESTServer";

export class Initializer {

  private log: LogService;
  private initListenerPool = {};
  private initialized: boolean = false;

  constructor(private db: Database,
    private wss: WSServer,
    private ea: EventAlarm,
    private bl: BusinessLayer) {
    this.log = LogService.getInstnce();
    this.log.info(entity, 'Starting...');
    this.init();
  }

  private async init() {
    try {
      await this.db.init();
      await this.wss.init();
      this.log.info(entity, 'Looking for event requests to restore...');
      let events = await this.db.find({ when: { $gt: Date.now() } });
      this.log.info(entity, `${events.length} event requests found`);
      if (events.length > 0) {
        this.log.info(entity, 'Restoring events...');
        this.ea.setAlarms(events)
      }
      this.bl.init();
      this.initialized = true;
      this.notifyInitListeners(true);
      this.log.info(entity, 'Started and awaiting requests...');
    } catch (error) {
      this.log.fatal(entity, `An initialization error has occured - ${error.message}`);
      this.notifyInitListeners(false);
      process.exit(-1);
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public registerInitListener(callback: Function): string {
    let guid: string = Guid.generateGuid();
    this.initListenerPool[guid] = callback;
    return guid;
  }

  public unregisterInitListener(guid: string): void {
    delete this.initListenerPool[guid];
  }

  private notifyInitListeners(status: boolean): void {
    for (let notification in this.initListenerPool) {
      this.initListenerPool[notification](status);
    }
  }
}