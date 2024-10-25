const {
  setupDatabaseConnetion,
  setUpServer,
  setUpServerRunner,
  setUpResigtrationAndUnregistrationRunner,
  runRunners,
  runClosers,
  setUpWebSocketListener,
  setUpConfig,
  setUpGameMatchScheduler 
} = require('./appContext');
const { runFuncs } = require('./utils/utils');

async function setup() {
  console.log("Setting up")
  await runFuncs(
    setUpConfig,
    setupDatabaseConnetion,
    setUpServer,
    setUpWebSocketListener,
    setUpServerRunner,
    setUpResigtrationAndUnregistrationRunner,
    setUpGameMatchScheduler
  )
}

async function run() {
  // refactor so context does not need to be exported
  console.log("Starting up")
  await runRunners();
  console.log("Server is up")
}

async function close() {
  // refactor so context does not need to be exported
  console.log("Exiting")
  await runClosers()
}

module.exports = {
  setup,
  run,
  close
}