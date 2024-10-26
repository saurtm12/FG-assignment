const { handleCreateGame, handleGetAllGames } = require("../endpoints/gameManagement");
const { handleGetHint } = require("../endpoints/hintConnect");

function servePostV1Game(dbConnection) {
    return async (req, res) => {
        const body = req.body;
        await handleCreateGame(dbConnection, body, res)
    }
}

function serveGetV1Game(dbConnection) {
    return async (req, res) => {
        await handleGetAllGames(dbConnection, res)
    }
}

function servePostV1Hint(dbConnection) {
    return async (req, res) => {
        const username = req.body.id;
        const gameId = req.body.gameId;
        await handleGetHint(dbConnection, username, gameId, res)
    }
}

function setupAppEndpoint(app, dbConnection) {
    app.post("/api/v1/game", servePostV1Game(dbConnection))
    app.get("/api/v1/game", serveGetV1Game(dbConnection))
    // will not go to delete/put game as they are not that complicated 
    // only thing is to deal with the update and delete is the cache, in the distrubuted system, the cache is shared
    app.post("/api/v1/hint", servePostV1Hint(dbConnection))
}

module.exports = {
    setupAppEndpoint
}