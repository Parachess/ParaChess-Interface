const gamesList = document.getElementById('game-list');
let gameURLAddress = null;

async function getGames() {
    try {
        const res = await fetch('/api/' + gameURLAddress + '/games');
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
            window.open('/' + gameURLAddress + '/jouer?g=' + id, '_self');
        } else {
            window.open('/' + gameURLAddress + '/jouer?g=' + id + "&fen=" + fen, '_self');
        }
    } else {
        document.getElementById("wrong-id-popup").classList.add('visible');
    }
}

function closePopups() {
    document.getElementById("wrong-id-popup").classList.remove('visible');
    document.getElementById("wait-popup").classList.remove('visible');
    document.getElementById("unknown-game-popup").classList.remove('visible');
}

function displayUnknownNamePopup(text) {
    document.getElementById("unknown-game-message").innerText = text;
    document.getElementById("unknown-game-popup").classList.add('visible');
}

function goToMenu() {
    window.open('/', '_self');
}

async function isValidNewId(newId) {
    const games = await getGames();
   for(var game of games) {
    if (newId.toLowerCase() === game.name.toLowerCase())
        return false;
   }
    return newId !== null && newId !== undefined && newId !== "";
}

async function loadGameInfo(gameURL) {
    const json =  await (await fetch('/api/' + gameURL + '/game')).json();
    if (json.status === 'error') {
        displayUnknownNamePopup(json.error);
        return;
    }
    const game = json.game;
    document.title += " à " + game.name;
    document.getElementById('logo-button-1').innerText = game.char1;
    document.getElementById('logo-button-2').innerText = game.char2;
    if (!game.askFen) document.getElementById("fen-form").classList.add("hidden");
}

window.onload = async _ => {
    window.goToMenu = goToMenu;
    const search = new URLSearchParams(window.location.search);
    if (!search.has('g')) {
        displayUnknownNamePopup("Le jeu auquel vous souhaitez jouer n'est pas renseigné.")
        return;
    }
    const gameURL = search.get('g');
    const validGameNames = await (await fetch('/api/games')).json();
    if (!validGameNames.includes(gameURL)) {
        displayUnknownNamePopup("Le jeu auquel vous souhaitez jouer est inconnu : \"" + gameURL + "\".")
        return; 
    }
    gameURLAddress = gameURL;
    const rulesButton = document.getElementById('rules-button');
    if (rulesButton) {
        rulesButton.href = "/regles/?g=" + gameURL;
    }
    loadGameInfo(gameURL);
    const games = await getGames();
    const gamesList = document.getElementById('game-list');
    if (games.length === 0) {
        const p = document.createElement("p");
        p.style.textAlign = "center"
        p.style.marginTop = "40px"
        p.innerText = "Aucune partie n'est actuellement en cours !";
        gamesList.replaceWith(p);
    } else {
        games.forEach(game => {
            const container = document.createElement('li');
            const p = document.createElement('p');
            const text = document.createElement('span');
            text.innerText = "Partie " + game.name;
            p.appendChild(text);
            if (game.playable) {
                const play = document.createElement('a');
                play.href = "/" + gameURLAddress + "/jouer?g=" + game.name;
                play.innerText = "Jouer"
                p.appendChild(play);
            } else {
                const play = document.createElement('span');
                play.classList.add('unplayable');
                play.innerText = 'Jouer'
                p.appendChild(play);
            }
            const watch = document.createElement('a');
            watch.href = "/" + gameURLAddress + "/regarder?g=" + game.name;
            watch.innerText = "Regarder";
            p.appendChild(watch);
            container.appendChild(p);
            gamesList.appendChild(container);
        });
    }
    window.createGame = createGame;
    window.closePopups = closePopups;
    window.createGameAutomatically = createGameAutomatically;
    document.getElementById('create').onclick = createGame;
}

async function createGameAutomatically() {
    document.getElementById('wait-popup').classList.add("visible");
    const req = await fetch("/api/" + gameURLAddress + "/create-game");
    const name = (await req.json()).name;
    window.open('/' + gameURLAddress + '/jouer?g=' + name, '_self');
}