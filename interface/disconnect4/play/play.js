window.connection = connection;
let socket = null;

function connection() {
    const search = new URLSearchParams(window.location.search);
    if (!search.has('g')) return;

    socket = io('/disconnect4', {
        query: {
            id: search.get('g')
        }
    });

    socket?.on('side', (status, side) => displayAttemptResult(status, side));
    socket?.on('voice-command', handleVoiceCommand);

    socket?.on('boardStates', states => {
        positions = states;
        positionsIndex = states.length - 1;
        createBoardGrid();
        createButtonGrid();
    });

    socket?.on('legalColumns', columns => {
        legalColumns = columns;
    });

    socket?.on('state', state => {
        let announcement = [];
        displaySideColor(state.opportunity)
        if (state.gameOver) {
            if (state.redWon) {
                showState("Les rouges ont gagné par " + state.reason + " .");
                announcement.push("Alignement de 4 pions ! Les rouges gagnent.");
            } else if (state.blueWon) {
                showState("Les bleus ont gagné par " + state.reason + ".");
                announcement.push("Alignement de 4 pions ! Les bleus gagnent.");
            } else {
                showState("Égalité par " + state.reason);
                announcement.push("Match nul par " + state.reason + "!");
            }
        }
        if (announcement.length > 0) {
            console.log(announcement.join(" ")); // ! TEMP
            // TODO : announce(announcement.join(" "));
        }
    });

    socket?.emit('may-play');
}

function sendMove(column) {
    socket?.emit('move', column);
}

function resetGame() {
    socket?.emit('resetState');
}

function resign() {
    document.getElementById("confirmation-popup").classList.add("visible");
    setTimeout(() => document.querySelector('#confirmation-popup .popup-option').focus(), 100);
}

function displayAttemptResult(status, side) {
    if (status !== "ALLOWED") {
        document.getElementById('refused-popup-text').innerText = side;
        document.getElementById('refused-popup').classList.add('visible');
        setTimeout(() => document.querySelector('#refused-popup .popup-option').focus(), 100);
        return;
    }
    if (side !== '*')
        document.getElementById('undo-button').classList.add('hidden');
}

function hideAll() {
    document.getElementById('state-popup').classList.remove('visible');
    document.getElementById('refused-popup').classList.remove('visible');
    document.getElementById('confirmation-popup').classList.remove('visible');
}

function watch() {
    const search = new URLSearchParams(window.location.search);
    window.open('/regarder/?g=' + search.get('g'), '_self');
}

function undo() {
    socket?.emit('undo');
}

function resign() {
    document.getElementById("confirmation-popup").classList.add("visible");
    setTimeout(() => document.querySelector('#confirmation-popup .popup-option').focus(), 100);
}

function validateResign(validation = false) {
    document.getElementById("confirmation-popup").classList.remove("visible");
    if (validation) socket?.emit("resign");
}

window.addEventListener('DOMContentLoaded', () => connection());