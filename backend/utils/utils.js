async function runFuncs(...funcs) {
    for (const func of funcs) {
        await func();
    }
}

function assertNotNull(param, paramName = undefined) {
    if (param === undefined || param === null || param === "") {
        throw new Error(`Error: param ${paramName} is null`)
    }
}

function writeError500(res, message) {
    res.status(500).json({
        message: message
    })
}

function writeError400(res, message) {
    res.status(400).json({
        message: message
    })
}

function incrementIdFunctionGenerator() {
    // Change from auto increment to random as intances can generate the same id
    return () => {
        return Math.floor(Math.random() * 1000000);
    }
}
module.exports = { runFuncs, assertNotNull, writeError400, writeError500, incrementIdFunctionGenerator }