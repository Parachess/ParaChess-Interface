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
}

function sendMove(column) {}

function hideAll() {
    document.getElementById('state-popup').classList.remove('visible');
}

window.addEventListener('DOMContentLoaded', () => connection());
connection();