const socket = io();

// =====================
// PLAYER
// =====================
let playerName = prompt("Enter your username");

if (!playerName || playerName.trim() === "") {
    playerName = "Player";
}

// =====================
// UI ELEMENTS
// =====================
const usernameEl = document.getElementById("username");
const statusEl = document.getElementById("status");

if (usernameEl) {
    usernameEl.innerText = "Player: " + playerName;
}

// =====================
// SCORE STATE
// =====================
let scores = {
    red: 0,
    blue: 0
};

// =====================
// MAP SETUP
// =====================
const map = L.map("map").setView(
    [40.121846, -75.122539],
    14
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
}).addTo(map);

// =====================
// TEAM COLORS
// =====================
function getColor(team) {
    if (team === "red") return "red";
    if (team === "blue") return "blue";
    return "gray";
}

// =====================
// DRAW TERRITORY
// =====================
function drawTerritory(data) {
    if (!data || !data.lat || !data.lng) return;

    const color = getColor(data.team);

    L.circle([data.lat, data.lng], {
        radius: data.radius || 150,
        color: color,
        fillColor: color,
        fillOpacity: 0.4
    })
    .addTo(map)
    .bindPopup(`${data.owner} (${data.team})`);
}

// =====================
// LOAD WORLD
// =====================
socket.on("loadTerritories", (territories) => {
    if (!Array.isArray(territories)) return;
    territories.forEach(drawTerritory);
});

// =====================
// NEW TERRITORY
// =====================
socket.on("newTerritory", (territory) => {
    drawTerritory(territory);
});

// =====================
// SCORE UPDATE
// =====================
socket.on("scoreUpdate", (data) => {
    scores = data;

    if (statusEl) {
        statusEl.innerHTML =
            `🔴 Red: ${scores.red} | 🔵 Blue: ${scores.blue}`;
    }
});

// =====================
// MATCH END
// =====================
socket.on("matchEnd", (data) => {

    if (statusEl) {
        statusEl.innerHTML =
            `🏆 ${data.winner.toUpperCase()} WINS!`;
    }
});

// =====================
// MATCH RESET
// =====================
socket.on("resetMatch", () => {
    location.reload();
});

// =====================
// CLICK COOLDOWN
// =====================
let lastClick = 0;

// =====================
// CLAIM LAND
// =====================
map.on("click", (event) => {

    const now = Date.now();

    if (now - lastClick < 100) {
        if (statusEl) {
            statusEl.innerText = "Wait before claiming again!";
        }
        return;
    }

    lastClick = now;

    socket.emit("claim", {
        owner: playerName,
        lat: event.latlng.lat,
        lng: event.latlng.lng
    });
});
