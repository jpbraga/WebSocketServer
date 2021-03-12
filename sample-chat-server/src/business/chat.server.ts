import { User } from "../interfaces/user.interface";

export class ChatServer {
    private users:UserHash = {}; 
    private userNames:UserHash = {};

    constructor() {
    }

    public addUser (uid:string, userName:string) {
        this.users[uid] = userName;
        this.userNames[userName] = uid;
    }

    public getUid(userName:string):string {
        return this.userNames[userName];
    }

    public removeUser (uid:string) {
        let userName = this.users[uid];
        delete this.users[uid];
        delete this.userNames[userName];
    }

    public getAllUsers ():string[] {
        let users = [];
        for(let user in this.userNames) {
            users.push(user);
        }
        return users;
    }
}

export interface UserHash {
    [uid: string]: string;
}