const { setup, run, close } = require("./app");

process.on('SIGINT', () => close().then(() => process.exit(0)));
process.on('SIGTERM', () => close().then(() => process.exit(0)));

(async () => {
    try {
        await setup();
        await run();
    } catch (error) {
        console.error('Error:', error);
        await close();
        process.exit(1);
    }
})();