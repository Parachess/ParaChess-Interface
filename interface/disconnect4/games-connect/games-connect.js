const gamesList = document.getElementById('game-list');

async function getGames() {
    try {
        const res = await fetch('/api/games');
        return await res.json();
    } catch {
        return [];
    }
}

async function createGame() {
    const id = document.getElementById('id').value;
    const fen = document.getElementById('fen-code').value;
    if (await isValidNewId(id)) {
        if (fen === "" || fen === null || fen === undefined) {
            window.open('/play?g=' + id, '_self');
        } else {
            window.open('/play?g=' + id + "&fen=" + fen, '_self');
        }
    } else {
        document.getElementById("wrong-id-popup").classList.add('visible');
    }
}

function closePopups() {
    document.getElementById("wrong-id-popup").classList.remove('visible');
    document.getElementById("wait-popup").classList.remove('visible');
}

async function isValidNewId(newId) {
    const games = await getGames();
   for(var game of games) {
    if (newId.toLowerCase() === game.name.toLowerCase())
        return false;
   }
    return newId !== null && newId !== undefined && newId !== "";
}

window.onload = async _ => {
    const games = await getGames();
    const gamesList = document.getElementById('game-list');
    if (games.length > 1) {
        games.forEach(game => {
            if (game.name !== "ParaChessDefaultGame") {
                const container = document.createElement('li');
                const p = document.createElement('p');
                const text = document.createElement('span');
                text.innerText = "Partie " + game.name;
                p.appendChild(text);
                if (game.playable) {
                    const play = document.createElement('a');
                    play.href = "/play?g=" + game.name;
                    play.innerText = "Jouer"
                    p.appendChild(play);
                } else {
                    const play = document.createElement('span');
                    play.classList.add('unplayable');
                    play.innerText = 'Jouer'
                    p.appendChild(play);
                }
                const watch = document.createElement('a');
                watch.href = "/watch?g=" + game.name;
                watch.innerText = "Regarder";
                p.appendChild(watch);
                container.appendChild(p);
                gamesList.appendChild(container);
            }
        });
    } else {
        const p = document.createElement("p");
        p.style.textAlign = "center"
        p.style.marginTop = "40px"
        p.innerText = "Aucune partie n'est actuellement en cours !";
        gamesList.replaceWith(p);
    }
    window.createGame = createGame;
    window.closePopups = closePopups;
    window.createGameAutomatically = createGameAutomatically;
    document.getElementById('create').onclick = createGame;
}

async function createGameAutomatically() {
    document.getElementById('wait-popup').classList.add("visible");
    const req = await fetch("/api/create-game");
    const name = (await req.json()).name;
    window.open('/play?g=' + name, '_self');
}