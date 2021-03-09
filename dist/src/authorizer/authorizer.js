"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTAuthorizer = void 0;
const jwt = require("jsonwebtoken");
class JWTAuthorizer {
    authorize(token, secret) {
        let authorize = {
            isAuthorized: false,
            uid: null
        };
        try {
            const user = jwt.verify(token, secret);
            authorize.isAuthorized = true;
            authorize.uid = user.uid;
            authorize.content = user;
            return authorize;
        }
        catch (er) {
            console.error(er);
            return authorize;
        }
    }
}
exports.JWTAuthorizer = JWTAuthorizer;
