
const mysql = require('mysql2/promise');

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { runFuncs, assertNotNull } = require('./utils/utils');
const { setupAppEndpoint } = require('./api/server');
const { serveWebSocket, serveMatchQueueFuncFactory } = require('./endpoints/game');

const context = {
    closers: [],
    runners: [],
    cfg: {},

    app: null,
    server: null,
    databaseConnection: null,
    wss: null,
    isRegisteredInstance: false
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
            console.log("Error from database :", err),
                runClosers();
        })
    }
}


async function setUpResigtrationAndUnregistrationRunner() {
    context.runners.push(registerActiveInstance);
    context.closers.push(unregisterInstance);
}

// TODO: to refactor
async function registerActiveInstance() {
    let [rows, fields] = await context.databaseConnection.execute("SELECT * FROM server WHERE instance_name = ? LIMIT 1", [context.cfg.instanceId])
    if (rows.length !== 0) {
        if (rows[0]["status"] === 'active') {
            throw new Error("Error when joining server group: instance is already active");
        }
        else {
            [rows, fields] = await context.databaseConnection.execute("UPDATE server SET status = ? WHERE instance_name = ?", ["active", context.cfg.instanceId])
            context.isRegisteredInstance = true;
        }
    } else {
        const row = [context.cfg.instanceId, context.cfg.instanceCountry, context.cfg.advertisedAddress, "active"];
        [rows, fields] = await context.databaseConnection.execute("INSERT INTO `server` (instance_name, country, advertised_address, status) VALUES (?, ?, ?, ?)", row)
        context.isRegisteredInstance = true;
    }

    console.log("Registerd to database");
}

// TODO: to refactor
async function unregisterInstance() {
    try {
        if (context.isRegisteredInstance) {
            await context.databaseConnection.execute("UPDATE server SET status = ? WHERE instance_name = ?", ["inactive", context.cfg.instanceId]);
            console.log("Unregistered instance")
        }
    }
    catch (err) {
        console.log("Error closing database", err)
    }
}


async function setUpServer() {
    // Initialize the Express app and HTTP server
    context.app = express();
    context.server = http.createServer(context.app);

    // Middleware for parsing JSON requests
    context.app.use(express.json());

    // Serve a simple HTTP endpoint
    setupAppEndpoint(context.app, context.databaseConnection);
}

async function setUpWebSocketListener() {
    context.wss = new WebSocket.Server({ server: context.server });
    context.wss.on('connection', serveWebSocket(context.databaseConnection));
}

async function setUpGameMatchScheduler() {
    let intervalId = undefined;
    context.runners.push( async () => {
        // interval could be configurable by env or database
        console.log("Starting scheduler");
        intervalId = setInterval(serveMatchQueueFuncFactory(context.databaseConnection), 5000)
    })
    context.closers.push( async () => {
        if (intervalId !== undefined) {
            clearInterval(intervalId);
        }
    })
}

async function setUpServerRunner() {
    context.runners.push(
        async () => {
            console.log("STARTING SERVER");
            const PORT = process.env.PORT || 3000;
            context.server.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
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