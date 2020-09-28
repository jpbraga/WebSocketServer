import MongoClient = require('mongodb');
import { LogService } from '../util/log.services';
const entity: string = "Database";

export class Database {
    private db: MongoClient.MongoClient = null;
    private dbo: MongoClient.Db = null;
    private log: LogService;

    constructor() {
        this.log = LogService.getInstnce();
    }

    public async init() {
        try {
            this.log.info(entity, `Connecting to the remote database as ${process.env.DB_URL}...`)
            this.db = await MongoClient.connect(process.env.DB_URL,
                {
                    useUnifiedTopology: true,
                    auth: {
                        user: process.env.DB_USER,
                        password: process.env.DB_PASSWORD
                    }
                });
            this.log.info(entity, `Connected to the remote database as ${process.env.DB_USER}`);
            this.log.info(entity, `Opening database ${process.env.DB_NAME}`);
            this.dbo = this.db.db(process.env.DB_NAME);
            this.log.info(entity, `${process.env.DB_NAME} opened!`);
            this.log.info(entity, "Database ready");
        } catch (er) {
            this.log.fatal(entity, er);
            throw er;
        }
    }

    public async insert(document: any | any[]) {
        if (!this.isInitialized()) throw new Error('The database was not initialized.');
        try {
            let insertedRecord = null;
            if (Array.isArray(document)) await this.dbo.collection(process.env.DB_COLLECTION).insertMany(document);
            else insertedRecord = await this.dbo.collection(process.env.DB_COLLECTION).insertOne(document);
            this.log.info(entity, 'Record(s) inserted.');
            return insertedRecord;
        } catch (er) {
            this.log.error(entity, er);
            throw er;
        }
    }

    public async find(query: MongoClient.FilterQuery<any> = {}) {
        if (!this.isInitialized()) throw new Error('The database was not initialized.');
        try {
            return this.dbo.collection(process.env.DB_COLLECTION).find(query).toArray();
        } catch (er) {
            this.log.error(entity, er);
            throw er;
        }
    }

    private isInitialized(): boolean {
        return (this.db && this.dbo) ? true : false;
    }
}


