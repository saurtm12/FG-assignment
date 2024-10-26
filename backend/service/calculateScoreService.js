// This is basic customized scoring algorithm and grouping players
// See the test for understanding the input

function calculateScore(user, formula) {
    // define more variable here if formula has more variable
    // for now I used only level
    // eslint-disable-next-line no-unused-vars
    const level = user.user_level;
    // formula is, example "level / 10", eval will evaluate level / 10 by the variable
    // using val() for simplicty
    const result = parseInt(Math.round(eval(formula)));
    // side effect here, but its okay for poc
    user.match_score = result;
    return result
}

// example of match Formula: `${country}`
function getPlayerPool(payload, matchFormula) {
    // eslint-disable-next-line no-unused-vars
    const country = payload.user_country;
    // using val() for simplicty
    const result = eval(matchFormula);
    return result
}

module.exports = { calculateScore, getPlayerPool }