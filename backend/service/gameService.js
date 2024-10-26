// Using in memory hashmap to cache
const gameStore = {}

const GET_GAME = `
    SELECT id, name, max_player, match_formula, logic FROM game
    WHERE id = ?;
`
const GET_ALL_GAMES =
    `SELECT id, name, max_player, match_formula, logic FROM game`

const CREATE_GAME =
    `
    INSERT INTO game (name, max_player, match_formula, logic)
    VALUES (?, ?, ?, ?);
    `

// I assume here that the game creation is done once and it hardly changes after
// Of course for the cache, it should be invalidated after some time
// so gameStore cache, in real life, it will delete the cache of game after the cache expired.
async function getGameInfo(gameId, db) {
    try {
        const id = parseInt(gameId);
        if (!(id in gameStore)) {
            const [[row]] = await db.execute(GET_GAME, [gameId]);
            gameStore[id] = row
            return row;
        }
        return gameStore[id]
    }
    catch (err) {
        throw new Error("Game not found")
    }
}

async function getAllGames(db) {
    try {
        const [rows] = await db.execute(GET_ALL_GAMES);
        rows.forEach(game => {
            gameStore[game.id] = game;
        });
        return rows;
    }
    catch (err) {
        throw new Error("Uh oh, something wrong happened" + err)
    }
}

async function createGame(db, game) {
    try {
        const [result] = await db.execute(CREATE_GAME,
            [game.name, game.max_player, game.match_formula, game.logic]);
        // we can cache immediately as lightweight
        return await getGameInfo(result.insertId, db)
    }
    catch (err) {
        console.log(err)
        throw new Error("Cannot create game" + err)
    }
}

module.exports = { getGameInfo, getAllGames, createGame }