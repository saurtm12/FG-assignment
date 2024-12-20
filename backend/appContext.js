
const mysql = require('mysql2/promise');

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { runFuncs, assertNotNull } = require('./utils/utils');
const { setupAppEndpoint } = require('./api/server');
const { serveWebSocketOnCreationFuncFactory, serveMatchQueueFuncFactory } = require('./endpoints/game');
const { getRegisterAcitiveInstanceWorker } = require('./service/deploymentService');

const context = {
    closers: [],
    runners: [],
    cfg: {},

    app: null,
    server: null,
    databaseConnection: null,
    wss: null
}


async function setUpConfig() {
    context.cfg.databaseAddress = process.env.DATABASE_ADDRESS;
    assertNotNull(context.cfg.databaseAddress, "database address");

    context.cfg.databaseUsername = process.env.DATABASE_USERNAME;
    assertNotNull(context.cfg.databaseUsername, "database username");

    context.cfg.databasePassword = process.env.DATABASE_PASSWORD;
    assertNotNull(context.cfg.databasePassword, "database password");

    context.cfg.databaseName = process.env.DATABASE_NAME;
    assertNotNull(context.cfg.databaseName, "database name");

    context.cfg.instanceId = process.env.INSTANCE_ID;
    assertNotNull(context.cfg.instanceId, "instance id");

    context.cfg.advertisedAddress = process.env.ADVERTISED_ADDRESS;
    assertNotNull(context.cfg.advertisedAddress, "instance advertised address");

    context.cfg.instanceCountry = process.env.COUNTRY;
    assertNotNull(context.cfg.instanceCountry, "instance country");
}

async function setupDatabaseConnetion() {
    console.log("Setting up Database connection")
    if (!context.databaseConnection) {
        const connection = await mysql.createConnection({
            host: context.cfg.databaseAddress,
            user: context.cfg.databaseUsername,
            password: context.cfg.databasePassword,
            database: context.cfg.databaseName
        });
        context.databaseConnection = connection;

        // Handle unexpected closed connection of the database during the run time
        // This typically need further handling, for example, using file peristent to store the state that 
        // Unregister will not be done and the data is stale when the server is restarted again.
        // This is just an stimulated handling at the database connection error, it shouldnt be this simple
        connection.on("error", err => {
            console.log("Error from database connetion :", err),
                runClosers();
        })
        context.closers.push(async () => {
            await connection.end()
            console.log("Disconnected to databse")
        })
    }
}


async function setUpResigtrationAndUnregistrationRunner() {
    const { runner, closer } = getRegisterAcitiveInstanceWorker(context.databaseConnection, context.cfg)
    context.runners.push(runner);
    context.closers.push(closer);
}




async function setUpServer() {
    console.log("Setting up Server")
    if (context.app === null || context.server === null) {
        context.app = express();
        context.server = http.createServer(context.app);
        context.app.use(express.json());
        setupAppEndpoint(context.app, context.databaseConnection);
    }
}

async function setUpWebSocketListener() {
    console.log("Setting up WebSocket server")
    if (context.wss === null) {
        context.wss = new WebSocket.Server({
            server: context.server,
            path: "/ws"
        });
        context.wss.on('connection', serveWebSocketOnCreationFuncFactory(context.databaseConnection));
    }
}

async function setUpGameMatchScheduler() {
    console.log("Setting up Scheduler")

    let intervalId = undefined;
    context.runners.push(async () => {
        console.log("Starting scheduler");
        // interval could be configurable by env or database
        intervalId = setInterval(serveMatchQueueFuncFactory(context.databaseConnection), 20000)
    })
    context.closers.push(async () => {
        if (intervalId !== undefined) {
            clearInterval(intervalId);
        }
    })
}

async function setUpServerRunner() {
    console.log("Setting up Server Runner")

    context.runners.push(
        async () => {
            console.log("STARTING SERVER");
            const PORT = process.env.PORT || 3000;
            context.server.listen(PORT, () => {
                console.log(`Server is running on ${context.cfg.advertisedAddress}`);
            });
        }
    )
    context.closers.push(async () => {
        context.server.close(err => {
            if (err) {
                console.log("Error in closing http server");
            }
        })
        console.log("Server closed");
    })
}


async function runRunners() {
    await runFuncs(...context.runners)
}


async function runClosers() {
    const closers = [...context.closers].reverse()
    await runFuncs(...closers)
}

module.exports = {
    setUpConfig,
    setupDatabaseConnetion,
    setUpServer,
    setUpWebSocketListener,
    setUpServerRunner,
    setUpResigtrationAndUnregistrationRunner,
    setUpGameMatchScheduler,
    runRunners,
    runClosers
}