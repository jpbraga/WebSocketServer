import { WSSClient } from "./wssClient";
import jwt = require('jsonwebtoken');
import { Guid } from "../src/util/guid";

let client: WSSClient = new WSSClient();
client.registerConnectionListener((status) => {
    console.log(status);
    client.sendMessage(JSON.stringify(
    {
        jwt_auth_token: token,
        SERVER_QUERY: ['wss_server_details']
    }))
});

client.registerMessageListener((msg) => {
    try {
        console.log(JSON.parse(msg));
    } catch (err) {
        console.log(msg);
    }
});

client.connect('127.0.0.1', '8080');
let guid = Guid.generateGuid();
console.log(guid);
let token = jwt.sign({
    uid: guid,
    email: 'jp.am.braga@gmail.com',
    name: 'Joao',
    lastName: 'Braga'
}, 'n5GySGhWlN9pWQBvmrnmJdKxmw-JTX0lKBSEYpYuOZY');


