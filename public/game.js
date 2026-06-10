const socket = io();

// =====================
let playerName = prompt("Enter your username");

if (!playerName || playerName.trim() === "") {
    playerName = "Player";
}

// =====================
const usernameEl = document.getElementById("username");
const statusEl = document.getElementById("status");

if (usernameEl) {
    usernameEl.innerText = "Player: " + playerName;
}

// =====================
let scores = {
    red: 0,
    blue: 0
};

// =====================
const map = L.map("map").setView(
    [40.121846, -75.122539],
    14
);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
}).addTo(map);

// =====================
function getColor(team) {
    if (team === "red") return "red";
    if (team === "blue") return "blue";
    return "gray";
}

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
socket.on("loadTerritories", (t) => {
    if (!Array.isArray(t)) return;
    t.forEach(drawTerritory);
});

socket.on("newTerritory", drawTerritory);

// =====================
// SCORE + TIMER UI
// =====================
socket.on("scoreUpdate", (data) => {
    scores = data;
});

socket.on("timerUpdate", (time) => {

    const m = Math.floor(time / 60);
    const s = time % 60;

    const formatted = `${m}:${s.toString().padStart(2, "0")}`;

    if (statusEl) {
        statusEl.innerHTML =
            `⏳ ${formatted} | 🔴 ${scores.red} | 🔵 ${scores.blue}`;
    }
});

// =====================
socket.on("matchEnd", (data) => {
    if (statusEl) {
        statusEl.innerHTML =
            `🏆 ${data.winner.toUpperCase()} WINS!`;
    }
});

// =====================
socket.on("resetMatch", () => {
    location.reload();
});

// =====================
let lastClick = 0;

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
