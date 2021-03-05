import * as dotenv from "dotenv";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

export class Environment {
    public static getValue(env:string, defaultValue?: any) {
        return (process.env[env])?process.env[env]:defaultValue;
    }
}