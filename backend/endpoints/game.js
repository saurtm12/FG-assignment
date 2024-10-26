// This is the logic for serving the game connection
// A player is queued when they establish connection to the socket

const { getPlayerPool } = require("../service/calculateScoreService");
const { getGameInfo } = require("../service/gameService");
const { incrementIdFunctionGenerator } = require("../utils/utils");

// local storage for storing the queue
// queue store having pools that is the matching function provided by the game, for example, country
// each pool hold an array that possible of player could group up together, later on, each pool will be sorted based on
// matching score, after than, each game will be created after a "cron job" (so it is a scheduler)

const queueStore = {}
const gameStore = {}

// using thresh_hold as simple way to handle that during the peak time,
// the queue is full up fast and we can organize the games before the scheduler.
const QUEUE_THRESHOLD = 500;
let numberOfClientsOnQueue = 0;

function serveWebSocketOnCreationFuncFactory(dbConnection) {
    return async function (ws, req) {
        let payload;
        let poolName;
        // use token for authentication too
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            payload = JSON.parse(atob(url.searchParams.get("token")));
        }
        catch (err) {
            ws.close(1008, "Invalid token")
            return;
        }

        // decorate, used for other places.
        payload.ws = ws;
        numberOfClientsOnQueue += 1;
        try {
            const game = await getGameInfo(payload.game_id, dbConnection);
            if (!(payload.game_id in queueStore)) {
                queueStore[payload.game_id] = {}
            }
            poolName = getPlayerPool(payload, JSON.parse(game.match_formula).match)
            if (poolName in queueStore[payload.game_id]) {
                // push connection and info together
                queueStore[payload.game_id][poolName].push(payload)
            }
            else {
                queueStore[payload.game_id][poolName] = [payload]
            }
            console.log(`Player ${payload.user_name}:${payload.user_id} joined game ${payload.game_id} queue in ${poolName} pool`)

            ws.on('close', () => {
                console.log(`Player ${payload.user_name}:${payload.user_id} leave game ${payload.game_id}`)
                // remove connection from storage
                numberOfClientsOnQueue -= 1;
                if (payload.match_id) {
                    gameStore[payload.match_id] = gameStore[payload.match_id].filter(client => client.user_id !== payload.user_id)
                }
                else {
                    queueStore[payload.game_id][poolName] = queueStore[payload.game_id][poolName].filter(client => client.user_id !== payload.user_id)
                }
            });

            // We can match the game if we have enough people in queue
            if (numberOfClientsOnQueue > QUEUE_THRESHOLD) {
                serveMatchQueueFuncFactory(dbConnection)();
            }
        }
        catch (err) {
            ws.close(1008, "Internal Error")
            numberOfClientsOnQueue -= 1;
            console.log("Error :", err)
            return;
        }
    }
}

// simple algorithm for match the queue
// basically iterate games -> pools, and then sort and partitions
// This will not handle, there is only 1 player in the queue :/
function serveMatchQueueFuncFactory(dbConnection) {
    return function () {
        numberOfClientsOnQueue = 0;
        // Using map for not putting order in order
        Object.keys(queueStore).map(game => {
            Object.keys(queueStore[game]).map(async (pool) => {
                try {
                    const poolArray = queueStore[game][pool];
                    poolArray.sort((p1, p2) => p1.match_score - p2.match_score);
                    if (poolArray.length === 0) {
                        return;
                    }
                    // Simple algorithm for the pool:
                    // Using dirichlet's box principle
                    // example: 
                    // {
                    //     totalPlayers: 34,
                    //     maxGroupSize: 10,
                    //     numberOfGroups: 4,
                    //     remainder: 2,
                    //     baseSize: 8,
                    //     groupSizeArray: [9,9,8,8]
                    // }
                    // good thing about this method is that for number of active player > maxGroupSize /2, 
                    // there will never be any game room having number of players < (maxGroupSize/2) 
                    const totalPlayers = poolArray.length
                    const maxGroupSize = (await getGameInfo(game, dbConnection)).max_player
                    const numberOfGroups = Math.ceil(totalPlayers / maxGroupSize)
                    const remainder = totalPlayers % numberOfGroups;
                    const baseSize = Math.floor(totalPlayers / numberOfGroups);
                    const groupSizeArray = [
                        ...(new Array(remainder).fill(baseSize + 1)),
                        ...(new Array(numberOfGroups - remainder).fill(baseSize))
                    ];
                    const groups = [];
                    let index = 0;
                    for (let i = 0; i < numberOfGroups; i++) {
                        groups.push(poolArray.slice(index, index + groupSizeArray[i]));
                        index = index + groupSizeArray[i];
                    }
                    groups.map(async (group) => await startGame(game, group, dbConnection))
                    //clear pool
                    queueStore[game][pool] = [];
                }
                catch (err) {
                    console.log(err);
                }
            })
        });
    }
}

// Place holder for interaction with DB, for poc, dbConnection is not used
// eslint-disable-next-line no-unused-vars
function startGame(gameId, group, dbConnection) {
    try {
        // remember to put match_id into payload
        const match = createNewGame(gameId, group);
        group.map(player => player.match_id = match.match_id);
        gameStore[match.match_id] = group;
        runMatch(match, group);
    }
    catch (err) {
        console.log("Error in starting the game", err);
    }
}
// eslint-disable-next-line no-unused-vars
function runMatch(match, group, dbConnection) {
    const info = `Game: ${match.game_id}, match ${match.match_id} started with ${group.length} players`;

    // This will simulate a game that expect the client to feed the input and wrapped as {intput: ${value}} when the client is notified as the game started.
    console.log(info);
    const COMMAND = "it is your turn to provide input";

    group.map(client => client.ws.on('message', (message) => {
        try {
            const provided_input = JSON.parse(message).input;
            client.provided_input = provided_input
            console.log(`player ${client.user_name} give input ${provided_input}`)
        }
        catch (err) {
            console.log("Error in parsing message from client", err)
        }
    }));

    group.map(client => client.ws.send(info));
    group.map(client => client.ws.send(COMMAND));
    // Client should be response with input when the COMMAND is dispatched

    setTimeout(() => {
        try {
            const inputNumbers = group.filter(player => player.provided_input !== undefined).map(player => player.provided_input);
            // assuming game strategy is random between player input
            // this can also be configurable by defining the fomula.
            // To keep application small, and probably I could might introduce bug with parsing the formal game logic description
            // I will demonstrate with only 1 hardcoded example
            // eslint-disable-next-line no-unused-vars
            const GAME_LOGIC = "RAND"
            const randomIndex = Math.floor(Math.random() * inputNumbers.length);
            const luckyNumber = inputNumbers[randomIndex];

            // for room of 1 player, the player always win regardless if he put any input or not
            const winners = group.filter(player => player.provided_input === luckyNumber).map(player => player.user_name).join(", ");
            // notify client:
            const info = `${winners} win! Game ended`;
            console.log(info)
            group.map(player => {
                player.ws.send(info);
            })

            closeGame(group);
        }
        catch (err) {
            console.log("Error in finalizing the game", err)
        }
        // Now decide who wins

        // And close
    }, 20000) // interval for a game is 20 seconds
}

function closeGame(group) {
    group.map(client => {
        client.ws.close(1000, "Socket closed");
    })
}

const matchIdGenerator = incrementIdFunctionGenerator();
// it is supposed to save in mysql, but I think I have spend quite some time on this, and already showed the work how to interact with the db
// so I will use in memory for saving data for the game.
function createNewGame(gameId, players) {
    return {
        match_id: matchIdGenerator(),
        game_id: gameId,
        createTime: new Date(),
        number_players: players.length
    }
}

module.exports = {
    serveWebSocketOnCreationFuncFactory,
    serveMatchQueueFuncFactory
}