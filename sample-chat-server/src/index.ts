import { EventNotification } from "./services/event.notification";
import { Initializer } from "./Initializer";
import { RESTApi } from "./api/rest";
import { BusinessLayer } from "./orchestration/business.layer";
import { ChatServer } from "./business/chat.server";

//Initialization
let rest:RESTApi = new RESTApi();
let en: EventNotification = new EventNotification();
let cs: ChatServer = new ChatServer();
let bs:BusinessLayer = new BusinessLayer(cs ,en, rest);
let server: Initializer = new Initializer(rest, bs);