// local storage for storing the queue
// queue store having pools that is the matching function provided by the game, for example, country
// each pool hold an array that possible of player could group up together, later on, each pool will be sorted based on
// matching score, after than, each game will be created after a "cron job" (so it is a scheduler)

// gameQueue :: {gameId -> poolName -> playerId -> {player}}
const queueStore = {}

function putNewPlayerIntoQueue(player, gameId, poolName) {
    if (!(gameId in queueStore)) {
        queueStore[player.game_id] = {}
    }
    if (!(poolName in queueStore[player.game_id])) {
        queueStore[player.game_id][poolName] = {}
    }
    queueStore[player.game_id][poolName][player.user_id] = player;
}

function removePlayerFromQueue(playerId, gameId, poolName) {
    delete queueStore[gameId][poolName][playerId];
}

// simple algorithm for match the queue
// basically iterate games -> pools, and then sort and partitions
// This will not handle, there is only 1 player in the queue :/
async function matchGroupsForQueueAndClear(getGameInfo, groupHandler) {
    Object.keys(queueStore).map(gameId => {
        Object.keys(queueStore[gameId]).map(async (pool) => {
            try {
                const poolArray = Object.values(queueStore[gameId][pool]);
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
                // With enough large of total player, there will be less than ${maxGroupSize} groups that have {maxGroupSize -1} players, 
                // and other groups are all filled with maximum player
                // i.e 256 players with max game slots of 10 will be distributed with 4 groups of 9, and 22 groups of 10.
                // And I think this is acceptable for simplicity
                const totalPlayers = poolArray.length
                const maxGroupSize = (await getGameInfo(gameId)).max_player
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
                // groups.map(async (group) => await startGame(game, group, dbConnection))
            
                groups.map(async (group) => await groupHandler(gameId, group) );
                //clear pool
                queueStore[gameId][pool] = {};
            }
            catch (err) {
                console.log(err);
            }
        })
    });
}

module.exports = {
    putNewPlayerIntoQueue,
    removePlayerFromQueue,
    matchGroupsForQueueAndClear
}