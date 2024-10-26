

// Use basic game store for the game play
// gameStore :: {match_Id -> [player]}

const { incrementIdFunctionGenerator } = require("../utils/utils");

// only for started and inprogress matches
const matchStore = {}

// gameStore :: {match_Id -> state("started", "inprogress", "ended")}
const matchState = {}
const STATES = ["started", "inprogress", "ended"];
const [STARTED, INPROGRESS, ENDED] = STATES

function removePlayerFromMatch(player, matchId) {
    if (!(matchId in matchState)) {
        throw new Error("Match not found " + matchId);
    }
    if (matchState[matchId] === ENDED) {
        return
    }
    // player leave when game is started/inprogress
    // modify reference of array
    const index = matchStore[matchId].findIndex(client => client.user_id === player.user_id);
    if (index !== -1) {
        matchStore[matchId].splice(index, 1)
    }
}

function changeMatchState(matchId, state) {
    if (STATES.includes(state)) {
        matchState[matchId] = state;
        if (state === ENDED) {
            delete matchStore[matchId];
        }
    } else {
        throw new Error("Invalid state input");
    }
}

const matchIdGenerator = incrementIdFunctionGenerator();
// it is supposed to save in mysql, but I think I have already spent quite some time on this
// and this shouldnt be difficult
// so I will use in memory for saving data for the game.
function createAndStartNewMatch(gameId, players) {
    const matchId = matchIdGenerator();
    players.map(player => player.match_id = matchId);
    matchStore[matchId] = players;
    matchState[matchId] = STARTED;
    return {
        match_id: matchId,
        game_id: gameId,
        createTime: new Date(),
        number_players: players.length,
        status: STARTED
    }
}
module.exports = {
    removePlayerFromMatch,
    createAndStartNewMatch,
    changeMatchState,
    STARTED,
    INPROGRESS,
    ENDED
}