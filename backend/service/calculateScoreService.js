// This is basic customized scoring algorithm and grouping players
// See the test for understanding the input

function calculateScore(user, formula) {
    // define more variable here if formula has more variable
    // for now I used only level
    const level = user.user_level;
    // formula is, example "level / 10", eval will evaluate level / 10 by the variable
    const result = parseInt(Math.round(eval(formula)));
    // side effect here, but its okay for poc
    user.match_score = result;
    return result
}

// example of match Formula: `${country}`
function getPlayerPool(payload, matchFormula) {
    const country = payload.user_country;
    const result = eval(matchFormula);
    return result
}

module.exports = { calculateScore, getPlayerPool }