import SimpleNodeLogger = require('simple-node-logger');


export class LogService {
    private static _selfInstance: LogService = null;
    private log: any;

    private constructor() {
        let opts = {
            //logFilePath:process.env.LOG_FILE,
            timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS',
            level: (!process.env.LOG_LEVEL)?'debug':process.env.LOG_LEVEL
        }
        this.log = SimpleNodeLogger.createSimpleLogger(opts)
        
    }

    public static getInstnce (): LogService {
        if (!this._selfInstance) this._selfInstance = new LogService();
        return this._selfInstance;
    } 

    public info(entity: string, content: any, params?:any) {
        this.log.info(entity, " - ", content );
    }

    public warn(entity: string, content: any, params?:any) {
        this.log.warn(entity, " - ", content );
    }

    public fatal(entity: string, content: any, params?:any) {
        this.log.fatal(entity, " - ", content );
    }

    public debug(entity: string, content: any, params?:any) {
        this.log.debug(entity, " - ", content );
    }

    public error(entity: string, content: any, params?:any) {
        this.log.error(entity, " - ", content );
    }
}
