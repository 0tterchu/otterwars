const express = require("express");
const http = require("http");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const FILE = "territories.txt";

// =====================
// GAME STATE
// =====================
let territories = [];

const playerTeams = {};

let scores = {
    red: 0,
    blue: 0
};

let matchActive = true;
let matchWinner = null;

// =====================
// LOAD SAVE FILE
// =====================
function loadTerritories() {
    if (!fs.existsSync(FILE)) return;

    const data = fs.readFileSync(FILE, "utf8").trim();
    if (!data) return;

    territories = data.split("\n").map(line => {
        const parts = line.split("|");
        return {
            owner: parts[0],
            team: parts[1],
            lat: parseFloat(parts[2]),
            lng: parseFloat(parts[3]),
            radius: parseFloat(parts[4])
        };
    });
}

// =====================
// SAVE FILE
// =====================
function saveTerritories() {
    const data = territories.map(t =>
        `${t.owner}|${t.team}|${t.lat}|${t.lng}|${t.radius}`
    ).join("\n");

    fs.writeFileSync(FILE, data, "utf8");
}

// =====================
// SCORE SYSTEM
// =====================
function updateScores() {

    scores.red = 0;
    scores.blue = 0;

    for (let t of territories) {
        if (t.team === "red") scores.red++;
        if (t.team === "blue") scores.blue++;
    }

    io.emit("scoreUpdate", scores);

    checkWinCondition();
}

// =====================
// WIN CONDITION
// =====================
function checkWinCondition() {

    if (!matchActive) return;

    const total = territories.length;
    if (total === 0) return;

    const redPct = scores.red / total;
    const bluePct = scores.blue / total;

    if (redPct >= 0.6) endMatch("red");
    if (bluePct >= 0.6) endMatch("blue");
}

// =====================
// END MATCH
// =====================
function endMatch(winner) {

    if (!matchActive) return;

    matchActive = false;
    matchWinner = winner;

    io.emit("matchEnd", { winner });

    console.log("Winner:", winner);

    setTimeout(resetMatch, 10000);
}

// =====================
// RESET MATCH
// =====================
function resetMatch() {

    territories = [];
    scores = { red: 0, blue: 0 };
    matchActive = true;
    matchWinner = null;

    saveTerritories();

    io.emit("resetMatch");

    console.log("Match restarted");
}

// =====================
// INIT
// =====================
loadTerritories();

// =====================
// SOCKET.IO
// =====================
io.on("connection", (socket) => {

    socket.emit("loadTerritories", territories);
    socket.emit("scoreUpdate", scores);

    socket.on("claim", (data) => {

        if (!matchActive) return;

        // assign team
        if (!playerTeams[data.owner]) {
            playerTeams[data.owner] =
                Math.random() < 0.5 ? "red" : "blue";
        }

        const team = playerTeams[data.owner];

        const captureRadius = 0.01;

        // =====================
        // CAPTURE LOGIC
        // =====================
        for (let t of territories) {

            const dist =
                Math.sqrt(
                    Math.pow(t.lat - data.lat, 2) +
                    Math.pow(t.lng - data.lng, 2)
                );

            if (dist < captureRadius) {

                t.owner = data.owner;
                t.team = team;

                io.emit("newTerritory", t);

                saveTerritories();
                updateScores();

                return;
            }
        }

        // =====================
        // NEW TERRITORY
        // =====================
        const newTerritory = {
            owner: data.owner,
            team: team,
            lat: data.lat,
            lng: data.lng,
            radius: 150
        };

        territories.push(newTerritory);

        io.emit("newTerritory", newTerritory);

        saveTerritories();
        updateScores();
    });
});

// =====================
// START SERVER
// =====================
server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
