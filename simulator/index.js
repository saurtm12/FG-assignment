// This file is for simulator, no implementation done here, mostly simulate what would the client code would do
// to communicate with the backend
const axios = require("axios");
const WebSocket = require('ws');


// Basically [1, 2, ...., 25]
const userIds = [];
for (let i = 1; i < 26; i++) {
    userIds.push(i);
}

const ENTRY_HOST = process.env.ENTRY_HOST;
console.log("ENTRY HOST:", ENTRY_HOST);

const hintUrl = `http://${ENTRY_HOST}/api/v1/hint`;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServerIsUp() {
    try {
        const url = `http://${ENTRY_HOST}/api/v1/game`;
        await axios.get(hintUrl)
    }
    catch (e) {
        await sleep(2000);
        checkServerIsUp();
    }
}

async function getTokenAndAdvertisedWebsocket(userIds) {
    const socketUrls = []
    for (let i = 0; i < userIds.length; i++) {
        const data = (await axios.post(hintUrl, {
            "id": userIds[i],
            "gameId": 1
        })).data;
        socketUrls.push(`http://${data.service}?token=${data.token}`)
    }
    return socketUrls;
}

function connectToSockets(socketUrls) {
    // Join in the queue
    const sockets = socketUrls.map(url => new WebSocket(url));
    sockets.map(socket => {
        socket.onmessage = event => {
            console.log(event.data);
            if (event.data === "it is your turn to provide input") {
                socket.send(JSON.stringify({
                    input: Math.floor(Math.random() * 20)
                }))
            }
        };
    });
    setInterval(() => {
        if (sockets.filter(socket => socket.readyState !== WebSocket.CLOSED).length === 0) {
            console.log("Exitting");
            process.exit(0);
        }
    },10000)
}

(async () => {
    await checkServerIsUp()
    const urls = await getTokenAndAdvertisedWebsocket(userIds);
    connectToSockets(urls);
})()
