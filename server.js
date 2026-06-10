const express = require("express");
const http = require("http");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const FILE = "territories.txt";

app.use(express.static("public"));

function loadTerritories() {

    if (!fs.existsSync(FILE)) {
        return [];
    }

    const lines =
        fs.readFileSync(FILE, "utf8")
        .split("\n")
        .filter(line => line.trim());

    const territories = [];

    for (const line of lines) {

        const parts = line.split("|");

        territories.push({
            owner: parts[0],
            lat: Number(parts[1]),
            lng: Number(parts[2]),
            radius: Number(parts[3])
        });

    }

    return territories;
}

function saveTerritory(owner, lat, lng) {

    fs.appendFileSync(
        FILE,
        `${owner}|${lat}|${lng}|150\n`
    );
}

io.on("connection", socket => {

    socket.emit(
        "loadTerritories",
        loadTerritories()
    );

    socket.on("claim", (data) => {

    const radius = 0.01; // “capture range” in map degrees

    let captured = false;

    // check if near existing territory
    for (let t of territories) {

        const dist =
            Math.sqrt(
                Math.pow(t.lat - data.lat, 2) +
                Math.pow(t.lng - data.lng, 2)
            );

        if (dist < radius) {

            // CAPTURE IT
            t.owner = data.owner;
            captured = true;

            io.emit("newTerritory", t);
            saveTerritories();

            return;
        }
    }

    // otherwise create new territory
    const newTerritory = {
        owner: data.owner,
        lat: data.lat,
        lng: data.lng,
        radius: 150
    };

    territories.push(newTerritory);

    io.emit("newTerritory", newTerritory);
    saveTerritories();
});

        saveTerritory(
            data.owner,
            data.lat,
            data.lng
        );

        io.emit(
            "newTerritory",
            {
                owner: data.owner,
                lat: data.lat,
                lng: data.lng,
                radius: 150
            }
        );

    });

});

server.listen(3000, () => {

    console.log(
        "Game running at http://localhost:3000"
    );

});
