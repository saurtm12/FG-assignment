const { getAllGames, createGame } = require("../service/gameService");
const { assertNotNull, writeError400 } = require("../utils/utils");

async function handleCreateGame(dbConnection, game, res) {
    try {
        assertNotNull(game.name, "game.name")
        assertNotNull(game.max_player, "game.max_player")
        assertNotNull(game.match_formula, "game.match_formula")
        assertNotNull(game.logic, "game.logic")
        res.json(await createGame(dbConnection, game));
    }
    catch (err) {
        writeError400(res, "Error" + err + err.stack)
    }
    
}

async function handleGetAllGames(dbConnection, res) {
    try {
        const games = await getAllGames(dbConnection);
        res.json(games);
    }
    catch (err) {
        writeError500(res, "Error" + err + err.stack)
    }
}

module.exports = {
    handleCreateGame,
    handleGetAllGames
}