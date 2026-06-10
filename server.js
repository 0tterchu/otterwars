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

    socket.on("claim", data => {

        const territories =
            loadTerritories();

        for (const territory of territories) {

            const dx =
                territory.lat - data.lat;

            const dy =
                territory.lng - data.lng;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (distance < 0.001) {

                socket.emit(
                    "errorMessage",
                    "Too close to another territory."
                );

                return;
            }
        }

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