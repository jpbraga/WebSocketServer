# Simple NodeJS WebSocket Server in Typescript

This project is developed in NodeJS using Typescript, ts-node component to run directly as typescript file, gulp tasks to build the dist version, mocha tests and it's docker ready.

# Functional description
This server establishes connections with its clients using websockets. Once the connection is established, a client can send an event request to be scheduled by the server. When an event time is reached, the server sends out a broadcast for all connected clients containing the event definition.

In a case of shutdown, pending events are restored from the database once the service is restarted.

**OBS**: *MongoDB collection has TTL enabled based on the event's date of execution.*

There are two ways of running this server:

# 1) Run directly as typescript
$ npm i

$ npm start

**IMPORTANT**: In the file .env at the root directory the LOG_LEVEL should be at "info" *level* in order to display startup log info.

*levels: trace, debug, info, warn, error and fatal levels (plus all and off)*


# 2) Run in a Docker
For this you will need the Docker engine (https://www.docker.com/) up and running.
One its ready do as following:

$ npm run build

$ docker build -t <alias> .

$ docker run -p <an available local port>:8080 -d <alias>
  

**Get container id**

$ docker ps


**Print the app log output**

$ docker logs <container-id>
  

The database it uses is a remote MongoDB Cluster. The database address, user and password are configured in the .env file.
*For all intents and purposes MongoDB user has no administrative privileges and will expire in a week*

# Mocha testing
This project has automated test scenarios developed in mocha.
To run the automated tests do as following:

$ npm i *(if not already)*

$ npm run test
