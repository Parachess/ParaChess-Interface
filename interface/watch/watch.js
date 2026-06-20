window.connection = connection;
let socket = null;
let legalMoves = [];

function connection() {
    const search = new URLSearchParams(window.location.search);
    if(!search.has('g')) return;

    socket = io('/game', {
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

    socket?.on('eval', eval => {
        if (!eval) return;
        if (typeof eval?.white === "number" && typeof eval?.black === "number"
            && typeof eval?.draw === "number" && typeof eval?.p === "number") {
            document.getElementById('stats-error').classList.add('hidden');
            document.getElementById('stats-list').classList.remove('hidden');
            document.getElementById('white-stats').innerText = eval.white;
            document.getElementById('black-stats').innerText = eval.black;
            document.getElementById('draw-stats').innerText = eval.draw;
            document.getElementById('score-p').innerText = (eval.p > 0 ? "+": "") + eval.p;
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
            if (state.whiteWon) {
                showState("Les blancs ont gagné par " + state.reason + ".")
            } else if (state.blackWon) {
                showState("Les noirs ont gagné par " + state.reason + ".")
            } else {
                showState("Égalité par " + state.reason)
            }
        }
    });
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