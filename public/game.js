```js
const socket = io();

// =====================
// PLAYER
// =====================
let playerName = prompt("Enter your username");

if (!playerName || playerName.trim() === "") {
    playerName = "Player";
}

// =====================
// UI
// =====================
const usernameEl = document.getElementById("username");
const statusEl = document.getElementById("status");
const claimBtn = document.getElementById("claimBtn");

if (usernameEl) {
    usernameEl.innerText = "Player: " + playerName;
}

// =====================
// SCORES
// =====================
let scores = {
    red: 0,
    blue: 0
};

// =====================
// MAP
// =====================
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

// =====================
// TERRITORY COLORS
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

    if (!data) return;
    if (!data.lat || !data.lng) return;

    const color = getColor(data.team);

    L.circle(
        [data.lat, data.lng],
        {
            radius: data.radius || 150,
            color: color,
            fillColor: color,
            fillOpacity: 0.4
        }
    )
    .addTo(map)
    .bindPopup(
        `${data.owner} (${data.team.toUpperCase()})`
    );
}

// =====================
// LOAD TERRITORIES
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

    updateStatusText();
});

// =====================
// TIMER UPDATE
// =====================
let currentTime = 300;

socket.on("timerUpdate", (time) => {

    currentTime = time;

    updateStatusText();
});

// =====================
// STATUS DISPLAY
// =====================
function updateStatusText() {

    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;

    const formatted =
        `${minutes}:${seconds
            .toString()
            .padStart(2, "0")}`;

    if (statusEl) {

        statusEl.innerHTML =
            `⏳ ${formatted}
             | 🔴 ${scores.red}
             | 🔵 ${scores.blue}`;
    }
}

// =====================
// MATCH END
// =====================
socket.on("matchEnd", (data) => {

    if (!statusEl) return;

    statusEl.innerHTML =
        `🏆 ${data.winner.toUpperCase()} WINS!`;
});

// =====================
// RESET MATCH
// =====================
socket.on("resetMatch", () => {

    location.reload();
});

// =====================
// CLAIM BUTTON
// =====================
let lastClaim = 0;

if (claimBtn) {

    claimBtn.addEventListener("click", () => {

        const now = Date.now();

        if (now - lastClaim < 2000) {

            if (statusEl) {
                statusEl.innerText =
                    "Wait before claiming again!";
            }

            return;
        }

        lastClaim = now;

        if (!navigator.geolocation) {

            if (statusEl) {
                statusEl.innerText =
                    "Geolocation not supported.";
            }

            return;
        }

        if (statusEl) {
            statusEl.innerText =
                "Getting your location...";
        }

        navigator.geolocation.getCurrentPosition(

            (position) => {

                const lat =
                    position.coords.latitude;

                const lng =
                    position.coords.longitude;

                socket.emit(
                    "claimLocation",
                    {
                        owner: playerName,
                        lat,
                        lng
                    }
                );

                if (statusEl) {
                    statusEl.innerText =
                        "Territory claimed!";
                }

                map.setView(
                    [lat, lng],
                    16
                );
            },

            (error) => {

                console.error(error);

                if (statusEl) {
                    statusEl.innerText =
                        "Location permission denied.";
                }
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}
```
