import mocha = require('mocha');
import * as dotenv from 'dotenv';
import { expect } from 'chai';

import jsonschema = require('jsonschema');
import { WSServer } from '../src/api/websocket';
import { Database } from '../src/database/database';
import { Initializer } from '../src/Initializer'
import { BusinessLayer } from '../src/orchestration/business.layer';
import { EventAlarm } from '../src/services/event.alarm';
import { WSSClient } from './wssClient';
import { REQUEST_RESPONSES } from '../src/api/response.consts';

const result = dotenv.config();
if (result.error) {
    throw result.error;
}

let client: WSSClient = new WSSClient();
let client2: WSSClient = new WSSClient();
let c2success:boolean = false;

let db: Database = new Database();
let ea: EventAlarm = new EventAlarm();
let wss: WSServer = new WSServer();
let bl: BusinessLayer = new BusinessLayer(db, ea, wss, new jsonschema.Validator());
let server: Initializer = null;
let sEId: string = '';

describe('Successful server test', function () {

        it('Successful server initialization', function (done) {
            this.timeout(10000);
            server = new Initializer(db, wss, ea, bl);
            server.registerInitListener((status: boolean) => {
                if(!status) done('Server initialization was unsuccessful');
                else done();
            });
        });
        it('Client #1 successfully connected to the server', function (done) {
            this.timeout(3000);
            client.registerConnectionListener((status) => {
                if(status.code === 0) done();
                else done(status.content)
            });
            client.connect('localhost', process.env.WSS_SRV_PORT);
        });
        it('Client #2 successfully connected to the server', function (done) {
            this.timeout(3000);
            client2.registerConnectionListener((status) => {
                if(status.code === 0) done();
                else done(status.content)
            });
            client2.connect('localhost', process.env.WSS_SRV_PORT);
        });
        it('Client #1 registered an event successfully', function (done) {
            client.registerMessageListener((message) => {
                let jMsg = JSON.parse(message);
                if(jMsg.code === REQUEST_RESPONSES.SUCCESS) done();
                else done(`Event was not registered due to an error: ${jMsg.message}`);
                sEId = jMsg.event._id;
            });
            client.sendMessage(JSON.stringify({
                event: "TESTE-EVENT",
                when: Date.now() + 3000
            }));
        });
        it('Event notification successfully received by Client #1', function (done) {
            this.timeout(6000);
            client.registerMessageListener((message) => {
                let jMsg = JSON.parse(message);
                if(jMsg.code === REQUEST_RESPONSES.EVENT && jMsg.event._id === sEId) done();
                else done(`${jMsg.message}`)
            });
            client2.registerMessageListener((message) => {
                let jMsg = JSON.parse(message);
                if(jMsg.code === REQUEST_RESPONSES.EVENT && jMsg.event._id === sEId) c2success = true;
                else c2success = false;
            });
        });
        it('Event notification successfully received by Client #2', function (done) {
            if(c2success) done();
            else done('Client #2 didnt receive the broadcast');
        });
});

describe('Unsuccessful server test', function () {
    this.timeout(6000);
    it('Event date inferior to now', function (done) {
        client.registerMessageListener((message) => {
            let jMsg = JSON.parse(message);
            if(jMsg.code === REQUEST_RESPONSES.ERROR) done();
            else done(`Event was not registered due to an error: ${jMsg.message}`);
        });
        client.sendMessage(JSON.stringify({
            event: "TESTE-EVENT",
            when: Date.now() - 1000
        }));
    });
    it('Event name with less than 4 characters', function (done) {
        client.registerMessageListener((message) => {
            let jMsg = JSON.parse(message);
            if(jMsg.code === REQUEST_RESPONSES.ERROR) done();
            else done(`Event was not registered due to an error: ${jMsg.message}`);
        });
        client.sendMessage(JSON.stringify({
            event: "FOO",
            when: Date.now() + 3000
        }));
    });
    it('Event name with more than 13 characters', function (done) {
        client.registerMessageListener((message) => {
            let jMsg = JSON.parse(message);
            if(jMsg.code === REQUEST_RESPONSES.ERROR) done();
            else done(`Event was not registered due to an error: ${jMsg.message}`);
        });
        client.sendMessage(JSON.stringify({
            event: "EVENT-WITH-A-LONG-NAME",
            when: Date.now() + 3000
        }));
    });
    it('Invalid JSON schema - Additional attribute', function (done) {
        client.registerMessageListener((message) => {
            let jMsg = JSON.parse(message);
            if(jMsg.code === REQUEST_RESPONSES.ERROR) done();
            else done(`Event was not registered due to an error: ${jMsg.message}`);
        });
        client.sendMessage(JSON.stringify({
            event: "EVENT-TEST",
            when: Date.now() + 3000,
            createdBy: 'Joao Braga'
        }));
    });
    it('Invalid JSON schema - No event attribute', function (done) {
        client.registerMessageListener((message) => {
            let jMsg = JSON.parse(message);
            if(jMsg.code === REQUEST_RESPONSES.ERROR) done();
            else done(`Event was not registered due to an error: ${jMsg.message}`);
        });
        client.sendMessage(JSON.stringify({
            when: Date.now() + 3000
        }));
    });
    it('Invalid JSON schema - No when attribute', function (done) {
        client.registerMessageListener((message) => {
            let jMsg = JSON.parse(message);
            if(jMsg.code === REQUEST_RESPONSES.ERROR) done();
            else done(`Event was not registered due to an error: ${jMsg.message}`);
        });
        client.sendMessage(JSON.stringify({
            event: "EVENT-TEST"
        }));
    });
    it('Invalid JSON schema - No when/event attributes and an additional attribute', function (done) {
        client.registerMessageListener((message) => {
            let jMsg = JSON.parse(message);
            if(jMsg.code === REQUEST_RESPONSES.ERROR) done();
            else done(`Event was not registered due to an error: ${jMsg.message}`);
        });
        client.sendMessage(JSON.stringify({
            createdBy: 'Joao Braga'
        }));
    });
});