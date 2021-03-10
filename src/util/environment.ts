import * as dotenv from "dotenv";

dotenv.config();

export class Environment {
    public static getValue(env:string, defaultValue?: any) {
        return (process.env[env])?process.env[env]:defaultValue;
    }
}