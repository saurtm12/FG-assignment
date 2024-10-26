

const { calculateScore } = require("../service/calculateScoreService");
const { getGameInfo } = require("../service/gameService");
const { getUserandPromotedInstanceForNewGame } = require("../service/userAndLocationService");
const { writeError500 } = require("../utils/utils");


// HandleGetHint server that the client will talk to during the game with contain
// "service": promoted address which would be the websocket that the client will send to
// "token": will be the payload containing
// user id, name, level, and computed matchmaking score
// it typically should be encode by jwt, and when token is exchange to promoted server,
// promoted server can use jwt again to claim the information back without extra query to db
// for SIMPLICITY, I will only base64 encoding and decoding
// and no timestamp injecting is done
// return example: 
// {token: "e2lkOiAiMSIsIG5hbWU6ICJkdWMifQ==", service: "localhost:3000/ws"}
// where token could be finally decode like this:
// {
//     "user_id": 12,
//     "user_name": "Antti",
//     "user_level": 45,
//     "user_country": "FI",
//     "match_score": 5,
//     "game_id":1
// }
// After this, client connect to localhost:3001 through websocket
async function handleGetHint(dbConnection, userId, gameId, res) {
    try {
        const userWithAdvertisedUrl = await getUserandPromotedInstanceForNewGame(dbConnection, userId);
        const game = await getGameInfo(gameId, dbConnection);
        const criteria = JSON.parse(game.match_formula);
        calculateScore(userWithAdvertisedUrl, criteria.score);
        userWithAdvertisedUrl.game_id = gameId
        const payload = { ...userWithAdvertisedUrl }
        delete payload.server_address;
        res.json({
            // Suppose to encode with jwt
            token: btoa(JSON.stringify(payload)),
            service: `${userWithAdvertisedUrl.server_address}/ws`
        });

    }
    catch (err) {
        writeError500(res, "Error" + err + err.stack)
    }
}


module.exports = {
    handleGetHint
}