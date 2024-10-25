
// basic algorithm for choosing the promoted server serving client game
// (I choosed that the country matched)
// This query should at least return 1 for advertised server 
// (i.e, if country not matched, then closest server with status active should be responsible)

const { calculateScore } = require("../service/calculateScoreService");
const { getGameInfo } = require("../service/gameService");
const { writeError500 } = require("../utils/utils");

// this cant return empty as at least this endpoint is serving.
const GET_PROMOTED_SERVER_AND_PLAYER = `
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.level AS user_level,
    u.country AS user_country,
    s.instance_name AS server_instance_name,
    s.advertised_address AS server_address
FROM 
    user u
JOIN 
    server s 
ON 
    u.country = s.country
WHERE 
    u.id = ? AND s.status = 'active';`



// HandleGetHint server that the client will talk to during the game with contain
// "service": promoted address which would be the websocket that the client will send to
// "token": will be the payload containing
// user id, name, level, and computed matchmaking score
// it typically should be encode by jwt, and when token is exchange to promoted server,
// promoted server can use jwt again to claim the information back without extra query to db
// for SIMPLICITY, I will only base64 encoding and decoding
// and no timestamp injecting is done
// return example: 
// {token: "e2lkOiAiMSIsIG5hbWU6ICJkdWMifQ==", service: "localhost:3000"}
// where token could be finally decode like this:
// {
//     "user_id": 12,
//     "user_name": "Antti",
//     "user_level": 45,
//     "user_country": "FI",
//     "server_instance_name": "fi-hel",
//     "match_score": 5
// }
// After this, client connect to localhost:3001 through websocket
async function handleGetHint(dbConnection, userId, gameId, res) {
    try {
        console.log({userId: userId, gameId: gameId})
        const [[row]] = await dbConnection.execute(GET_PROMOTED_SERVER_AND_PLAYER, [userId]);
        const game = await getGameInfo(gameId, dbConnection);
        const criteria = JSON.parse(game.match_formula);
        calculateScore(row, criteria.score);
        row.game_id = gameId
        const payload = {...row}
        delete payload.server_address;
        delete payload.server_instance_name;
        res.json({
            token: btoa(JSON.stringify(payload)),
            service: `${row.server_address}/ws`
        });

    }
    catch (err) {
        writeError500(res, "Error" + err + err.stack)
    }
}


module.exports = {
    handleGetHint
}