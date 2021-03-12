import { Authorize } from "./authorizer.authorize";

export interface Authorizer {
    authorize(token:string, secret:string): Authorize;
}