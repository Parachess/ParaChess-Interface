window.connection = connection;
window.victoryDisplayed = false;
let socket = null;
let legalMoves = [];

const fireworksContainer = document.querySelector('#fireworks');
const fireworks = new Fireworks.Fireworks(fireworksContainer, {
    explosion: 10
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


function connection() {
    const search = new URLSearchParams(window.location.search);
    if(!search.has('g')) return;

    socket = io('/parachess', {
        query: {
            id: search.get('g')
        }
    });

    socket?.on('boardStates', states => {
        positionsIndex = states.length - 1;
        positions = states;
        setChessBoard();
    });

    socket?.on('legalMoves', moves => {
        legalMoves = moves;
    });

    socket?.on('eval', evaluation => {
        if (!evaluation) return;
        if (typeof evaluation?.white === "number" && typeof evaluation?.black === "number"
            && typeof evaluation?.draw === "number" && typeof evaluation?.p === "number") {
            document.getElementById('stats-error').classList.add('hidden');
            document.getElementById('stats-list').classList.remove('hidden');
            document.getElementById('white-stats').innerText = evaluation.white;
            document.getElementById('black-stats').innerText = evaluation.black;
            document.getElementById('draw-stats').innerText = evaluation.draw;
            document.getElementById('score-p').innerText = (evaluation.p > 0 ? "+" : "") + evaluation.p;
        } else {
            document.getElementById('stats-list').classList.add('hidden');
            document.getElementById('stats-error').classList.remove('hidden');
        }
    });

    socket?.on('state', state => {
        const squares = document.querySelectorAll('.square');
        for (const square of squares) {
            square.classList.remove('check');
        }
        if (state.whiteKingCheck !== null && state.whiteKingCheck !== "null") {
            document.querySelector(`.square[data-pos=${state.whiteKingCheck}]`).classList.add('check');
        }
        if (state.blackKingCheck !== null && state.blackKingCheck !== "null") {
            document.querySelector(`.square[data-pos=${state.blackKingCheck}]`).classList.add('check');
        }
        if (state.opportunity === 'w') {
            document.getElementById("side").innerHTML = "Trait au blanc.";
            document.getElementById("side").classList.add("white-turn");
            document.getElementById("side").classList.remove("black-turn");
        } else {
            document.getElementById("side").innerHTML = "Trait au noir.";
            document.getElementById("side").classList.add("black-turn");
            document.getElementById("side").classList.remove("white-turn");
        }
        if (state.gameOver) {
            if (!window.victoryDisplayed) {
                window.victoryDisplayed = true;
                feastVictory();
            }
            if (state.whiteWon) {
                showState("Les blancs ont gagné par " + state.reason + ".")
            } else if (state.blackWon) {
                showState("Les noirs ont gagné par " + state.reason + ".")
            } else {
                showState("Égalité par " + state.reason)
            }
        }
    });

    socket?.on('resetBoard', () => window.victoryDisplayed = false);
}

function sendMove(from, to) {
    sendMove(from, to, null)
}

function sendMove(from, to, piece) {
    positionsIndex += 1;
    if (positionsIndex < positions.length - 1) {
        for (let i = 0; i <= positions.length - 1 - positionsIndex; i++) {
            positions.pop();
        }
    }
    positions[positionsIndex] = exportChessBoardObject();
    legalMoves = null;
}

function hideAll() {
    document.getElementById('promotion-popup').classList.remove('visible');
    document.getElementById('state-popup').classList.remove('visible');
}

function showCoordinates() {
    const checkbox = document.getElementById('showCoordinates');
    document.getElementById("chessboard").classList.toggle('show-coordinates', checkbox.checked);
}

document.getElementById('showCoordinates').onchange = showCoordinates;
connection();

async function feastVictory() {
    setTimeout(() => document.querySelector('#state-popup .popup-option').focus(), 100);

    const colors = [
        "#FF006E",
        "#FB5607",
        "#FFBE0B",
        "#00F5D4",
        "#00BBF9",
        "#8338EC",
        "#FF4D6D",
        "#FFFFFF"
    ];

    fireworks.launch(20);

    setTimeout(() => {
        confetti({
            position: { x: window.innerWidth / 2, y: window.innerHeight },
            count: 1000,
            size: 3,
            velocity: 1000,
            fade: false,
            colors
        });
    }, 600);

    const cheeringSong = document.querySelector('#cheeringSong');
    cheeringSong.volume = 0.2;
    try {
        cheeringSong.currentTime = 1.9
        await cheeringSong.play();

        setTimeout(() => {
            cheeringSong.pause();
        }, 15000);
    } catch { }

    await wait(2000);
    fireworks.launch(20);
    confetti({
        position: { x: window.innerWidth / 2, y: window.innerHeight },
        count: 500,
        size: 2,
        velocity: 1000,
        fade: false,
        colors
    });
}