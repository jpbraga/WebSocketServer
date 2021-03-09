"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Guid = void 0;
class Guid {
    static generateGuid() {
        const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return guid;
    }
}
exports.Guid = Guid;
