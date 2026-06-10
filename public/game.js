const socket = io();

const playerName =
    prompt("Enter your username");

document.getElementById(
    "username"
).innerText =
    "Player: " + playerName;

const map = L.map("map").setView(
    [40.121846, -75.122539],
    14
);

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
        "&copy; OpenStreetMap"
    }
).addTo(map);

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

    for (
        let i = 0;
        i < name.length;
        i++
    ) {

        value +=
            name.charCodeAt(i);

    }

    return colors[
        value % colors.length
    ];
}

function drawTerritory(data) {

    const color =
        getColor(data.owner);

    L.circle(
        [data.lat, data.lng],
        {
            radius:
                data.radius,

            color:
                color,

            fillColor:
                color,

            fillOpacity:
                0.4
        }
    )
    .addTo(map)
    .bindPopup(
        data.owner
    );
}

socket.on(
    "loadTerritories",
    territories => {

        for (
            const territory
            of territories
        ) {

            drawTerritory(
                territory
            );
        }

    }
);

socket.on(
    "newTerritory",
    territory => {

        drawTerritory(
            territory
        );

    }
);

socket.on(
    "errorMessage",
    message => {

        document.getElementById(
            "status"
        ).innerText =
            message;

    }
);

map.on(
    "click",
    event => {

        socket.emit(
            "claim",
            {

                owner:
                    playerName,

                lat:
                    event.latlng.lat,

                lng:
                    event.latlng.lng

            }
        );

    }
);