const express = require("express");
const http = require("http");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const FILE = "territories.txt";

// =====================
// GAME STATE
// =====================
let territories = [];
let playerTeams = {};

let scores = {
    red: 0,
    blue: 0
};

let matchActive = true;

// =====================
// TIMER
// =====================
let timeLeft = 300;
let timerInterval = null;

// =====================
// LOAD / SAVE
// =====================
function loadTerritories() {
    if (!fs.existsSync(FILE)) return;

    const raw = fs.readFileSync(FILE, "utf8").trim();
    if (!raw) return;

    territories = raw.split("\n").map(line => {
        const [owner, team, lat, lng, radius] = line.split("|");
        return {
            owner,
            team,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            radius: parseFloat(radius)
        };
    });
}

function saveTerritories() {
    const out = territories
        .map(t => `${t.owner}|${t.team}|${t.lat}|${t.lng}|${t.radius}`)
        .join("\n");

    fs.writeFileSync(FILE, out, "utf8");
}

// =====================
// SCORE SYSTEM
// =====================
function updateScores() {
    scores.red = territories.filter(t => t.team === "red").length;
    scores.blue = territories.filter(t => t.team === "blue").length;

    io.emit("scoreUpdate", scores);
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

function endMatchByTime() {
    const total = scores.red + scores.blue;

    if (total === 0) {
        endMatch("tie");
        return;
    }

    const redPct = scores.red / total;
    const bluePct = scores.blue / total;

    let winner = "tie";
    if (redPct > bluePct) winner = "red";
    if (bluePct > redPct) winner = "blue";

    endMatch(winner);
}

// =====================
// TIMER LOOP
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

// =====================
// INIT
// =====================
loadTerritories();
updateScores();
startTimer();

// =====================
// SOCKET.IO
// =====================
io.on("connection", socket => {
    console.log("Player connected");

    socket.emit("loadTerritories", territories);
    socket.emit("scoreUpdate", scores);
    socket.emit("timerUpdate", timeLeft);

    socket.on("claimLocation", data => {
        if (!matchActive) return;
        if (!data || typeof data.lat !== "number" || typeof data.lng !== "number" || !data.owner) return;

        // Assign team if new
        if (!playerTeams[data.owner]) {
            playerTeams[data.owner] = Math.random() < 0.5 ? "red" : "blue";
        }

        const team = playerTeams[data.owner];
        const captureRadius = 0.01;

        // Try capturing existing territory
        for (const t of territories) {
            const dist = Math.sqrt(
                (t.lat - data.lat) ** 2 +
                (t.lng - data.lng) ** 2
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

        // Create new territory
        const newT = {
            owner: data.owner,
            team,
            lat: data.lat,
            lng: data.lng,
            radius: 150
        };

        territories.push(newT);

        io.emit("newTerritory", newT);
        saveTerritories();
        updateScores();
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected");
    });
});

// =====================
// START SERVER
// =====================
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
