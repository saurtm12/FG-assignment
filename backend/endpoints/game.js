// This is the logic for serving the game connection
// A player is queued when they establish connection to the socket

const { getPlayerPool } = require("../service/calculateScoreService");
const { putNewPlayerIntoQueue, removePlayerFromQueue, matchGroupsForQueueAndClear } = require("../service/gameQueueService");
const { getGameInfo } = require("../service/gameService");
const { removePlayerFromMatch } = require("../service/gameMatchService");
const { startGame } = require("../service/gameEngineService");

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
            ws.close(3000, "Invalid token")
            return;
        }

        // decorate, used for other places.
        payload.ws = ws;
        numberOfClientsOnQueue += 1;
        try {
            const game = await getGameInfo(payload.game_id, dbConnection);
            
            poolName = getPlayerPool(payload, JSON.parse(game.match_formula).match)
            putNewPlayerIntoQueue(payload, payload.game_id, poolName)

            console.log(`Player ${payload.user_name}:${payload.user_id} joined game ${payload.game_id} queue in ${poolName} pool`)

            ws.on('close', () => {
                console.log(`Player ${payload.user_name}:${payload.user_id} leave game ${payload.game_id}`)

                // Player is ready matched and not in the queue
                if (payload.match_id) {
                    removePlayerFromMatch(payload, payload.match_id);
                }
                else {
                    // User leave the queue
                    numberOfClientsOnQueue -= 1;
                    removePlayerFromQueue(payload.user_id, payload.game_id, poolName);
                }
            });

            // We can match the game if we have enough people in queue
            if (numberOfClientsOnQueue > QUEUE_THRESHOLD) {
                serveMatchQueueFuncFactory(dbConnection)();
            }
        }
        catch (err) {
            ws.close(1011, "Internal Error")
            numberOfClientsOnQueue -= 1;
            console.log("Error :", err)
            return;
        }
    }
}

function serveMatchQueueFuncFactory(dbConnection) {
    // constructing gameInfo service
    const getGameInfoFunc = async (gameId) => await getGameInfo(gameId, dbConnection);
    return function () {
        numberOfClientsOnQueue = 0;
        matchGroupsForQueueAndClear(
            getGameInfoFunc,
            startGame
        );
    }
}

module.exports = {
    serveWebSocketOnCreationFuncFactory,
    serveMatchQueueFuncFactory
}