const socket = io();

let playerName = prompt("Enter your username");

if (!playerName || playerName.trim() === "") {
    playerName = "Player";
}

const usernameEl = document.getElementById("username");
const statusEl = document.getElementById("status");

if (usernameEl) {
    usernameEl.innerText = "Player: " + playerName;
}

// Create map
const map = L.map("map").setView(
    [40.121846, -75.122539],
    14
);

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap"
    }
).addTo(map);

// Color system
function getColor(name) {
    const colors = [
        "red",
        "blue",
        "green",
        "purple",
        "orange",
        "pink",
        "cyan",
        "yellow"
    ];

    let value = 0;

    for (let i = 0; i < name.length; i++) {
        value += name.charCodeAt(i);
    }

    return colors[value % colors.length];
}

// Draw territory safely
function drawTerritory(data) {
    if (!data || !data.lat || !data.lng) return;

    const color = getColor(data.owner || "unknown");

    L.circle([data.lat, data.lng], {
        radius: data.radius || 150,
        color: color,
        fillColor: color,
        fillOpacity: 0.4
    })
    .addTo(map)
    .bindPopup(data.owner || "Unknown");
}

// Load existing territories
socket.on("loadTerritories", (territories) => {
    if (!Array.isArray(territories)) return;

    territories.forEach(drawTerritory);
});

// New territory from server
socket.on("newTerritory", (territory) => {
    drawTerritory(territory);
});

// Error messages
socket.on("errorMessage", (message) => {
    if (statusEl) {
        statusEl.innerText = message;
    }
});

// Click to claim land
let lastClick = 0;

map.on("click", (event) => {

    const now = Date.now();

    if (now - lastClick < 2000) {
        statusEl.innerText = "Wait before claiming again!";
        return;
    }

    lastClick = now;

    socket.emit("claim", {
        owner: playerName,
        lat: event.latlng.lat,
        lng: event.latlng.lng
    });
});
