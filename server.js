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

// TIMER
let timeLeft = 300;
let timerInterval = null;

// =====================
// LOAD / SAVE
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
}

// =====================
// TIMER SYSTEM
// =====================
function startTimer() {

    if (timerInterval) return;

    timerInterval = setInterval(() => {

        if (!matchActive) return;

        timeLeft--;

        io.emit("timerUpdate", timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;

            endMatchByTime();
        }

    }, 1000);
}

function endMatchByTime() {

    const total = scores.red + scores.blue;
    if (total === 0) return;

    let winner = "tie";

    const redPct = scores.red / total;
    const bluePct = scores.blue / total;

    if (redPct > bluePct) winner = "red";
    if (bluePct > redPct) winner = "blue";

    endMatch(winner);
}

// =====================
// MATCH SYSTEM
// =====================
function endMatch(winner) {

    if (!matchActive) return;

    matchActive = false;

    io.emit("matchEnd", { winner });

    setTimeout(resetMatch, 10000);
}

function resetMatch() {

    territories = [];
    scores = { red: 0, blue: 0 };
    matchActive = true;
    timeLeft = 300;

    saveTerritories();

    io.emit("resetMatch");
    io.emit("timerUpdate", timeLeft);

    startTimer();
}

// =====================
// INIT
// =====================
loadTerritories();
startTimer();

// =====================
// SOCKET
// =====================
io.on("connection", (socket) => {

    socket.emit("loadTerritories", territories);
    socket.emit("scoreUpdate", scores);
    socket.emit("timerUpdate", timeLeft);

    socket.on("claim", (data) => {

        if (!matchActive) return;

        // assign team
        if (!playerTeams[data.owner]) {
            playerTeams[data.owner] =
                Math.random() < 0.5 ? "red" : "blue";
        }

        const team = playerTeams[data.owner];

        const captureRadius = 0.01;

        // capture check
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

        // new territory
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
server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
