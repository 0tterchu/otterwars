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

// =====================
// LOAD SAVED DATA
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
// SAVE DATA (TEXT FILE)
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

        // assign team if new player
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
