const socket = io();

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
// MAP INIT
// =====================
const map = L.map("map").setView(
    [40.121846, -75.122539],
    14
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
}).addTo(map);

// =====================
// TEAM COLOR SYSTEM
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
    .bindPopup(data.owner || "Unknown");
}

// =====================
// LOAD EXISTING WORLD
// =====================
socket.on("loadTerritories", (territories) => {
    if (!Array.isArray(territories)) return;
    territories.forEach(drawTerritory);
});

// =====================
// NEW TERRITORY UPDATE
// =====================
socket.on("newTerritory", (territory) => {
    drawTerritory(territory);
});

// =====================
// SCORE UPDATE (LIVE UI)
// =====================
socket.on("scoreUpdate", (data) => {
    scores = data;

    if (statusEl) {
        statusEl.innerHTML =
            `🔴 Red: ${scores.red} | 🔵 Blue: ${scores.blue}`;
    }
});

// =====================
// CLICK COOLDOWN (ANTI-SPAM)
// =====================
let lastClick = 0;

// =====================
// CLAIM LAND
// =====================
map.on("click", (event) => {

    const now = Date.now();

    if (now - lastClick < 2000) {
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
