window.connection = connection;
window.victoryDisplayed = false;
let socket = null;
let side = 'r';

const fireworksContainer = document.querySelector('#fireworks');
const fireworks = new Fireworks.Fireworks(fireworksContainer, {
    explosion: 10
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

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
            if (!window.victoryDisplayed) {
                window.victoryDisplayed = true;
                if (side === '*' || side === 'r' && state.redWon || side === 'b' && state.blueWon)
                    feastVictory();
                else {
                    // defeat;
                }
            }
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

    socket?.on("resetBoard", () => window.victoryDisplayed = false);

    socket?.emit('may-play', search.has("seul") ? 2 : 1);
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

function displayAttemptResult(status, color) {
    if (status !== "ALLOWED") {
        document.getElementById('refused-popup-text').innerText = color;
        document.getElementById('refused-popup').classList.add('visible');
        setTimeout(() => document.querySelector('#refused-popup .popup-option').focus(), 100);
        return;
    }
    side = color;
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

window.addEventListener('DOMContentLoaded', () => connection());