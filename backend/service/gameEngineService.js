const { 
    createAndStartNewMatch, 
    changeMatchState,
    INPROGRESS,
    ENDED
} = require("./gameMatchService");

function startGame(gameId, group) {
    try {
        const match = createAndStartNewMatch(gameId, group);
        runMatch(match, group);
    }
    catch (err) {
        console.log("Error in starting the game", err);
    }
}

function runMatch(match, group) {
    changeMatchState(match.match_id, INPROGRESS);
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
            // To keep application small, and probably I would introduce bug with parsing the formal game logic description
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

            closeGame(group, match.match_id);
        }
        catch (err) {
            console.log("Error in finalizing the game", err)
        }
    }, 20000) // interval for a game is 20 seconds
}

function closeGame(group, match_id) {
    // Saving to the db placeholder
    
    changeMatchState(match_id, ENDED);
    group.map(client => {
        client.ws.close(1000, "Socket closed");
    });
}

module.exports = {
    startGame
}