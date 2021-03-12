import jwt = require('jsonwebtoken');
import { Authorizer } from '../interfaces/authorizer';
import { Authorize } from '../interfaces/authorizer.authorize';

export class JWTAuthorizer implements Authorizer {

    public authorize(token: string, secret: string): Authorize {
        let authorize: Authorize = {
            isAuthorized: false,
            uid: null
        };
        try {
            const user = jwt.verify(token, secret);
            authorize.isAuthorized = true;
            authorize.uid = user.uid;
            authorize.content = user;
            return authorize;
        } catch (er) {
            console.error(er);
            return authorize;
        }
    }

}