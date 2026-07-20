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

    socket?.on('side', (status, side) => displayAttemptResult(status, side));

    socket?.on('boardStates', states => {
        positionsIndex = states.length - 1;
        positions = states;
        setChessBoard();
    });

    socket?.on('move', (from, to) => {
        const moveHighlightedSquares = Array.from(document.getElementsByClassName('moveHighlighted'));
        for(const square of moveHighlightedSquares) {
            square.classList.remove('moveHighlighted');
        }

        const fromSquare = document.querySelector(`.square[data-pos=${from}]`);
        const toSquare = document.querySelector(`.square[data-pos=${to}]`);

        fromSquare.classList.add('moveHighlighted');
        toSquare.classList.add('moveHighlighted');
    });

    socket?.on('legalMoves', moves => {
        legalMoves = moves;
    });

    socket?.on('state', state => {
        const squares = document.querySelectorAll('.square');
        for (const square of squares) {
            square.classList.remove('check');
        }
        let announcement = [];
        if (state.whiteKingCheck !== null && state.whiteKingCheck !== "null") {
            document.querySelector(`.square[data-pos=${state.whiteKingCheck}]`).classList.add('check');
            announcement.push("Échec !");
        }
        if (state.blackKingCheck !== null && state.blackKingCheck !== "null") {
            document.querySelector(`.square[data-pos=${state.blackKingCheck}]`).classList.add('check');
            announcement.push("Échec !");
        }
        if (state.opportunity === 'w') {
            document.getElementById("side").innerHTML = "Trait au blanc.";
            document.getElementById("side").classList.add("white-turn");
            document.getElementById("side").classList.remove("black-turn");
            announcement.push("Trait au blanc.");
        } else {
            document.getElementById("side").innerHTML = "Trait au noir.";
            document.getElementById("side").classList.add("black-turn");
            document.getElementById("side").classList.remove("white-turn");
            announcement.push("Trait au noir.");
        }
        if (state.gameOver) {
            if (state.whiteWon) {
                showState("Les blancs ont gagné par " + state.reason + ".");
                announcement.push("Échec et mat ! Les blancs gagnent.");
            } else if (state.blackWon) {
                showState("Les noirs ont gagné par " + state.reason + ".");
                announcement.push("Échec et mat ! Les noirs gagnent.");
            } else {
                showState("Égalité par " + state.reason);
                announcement.push("Match nul !");
            }
        }
        if (announcement.length > 0) {
            announce(announcement.join(" "));
        }
    });
    
    socket?.emit('may-play');
    if (!search.has('fen')) return;
    socket?.emit('fen', search.get('fen'));
}

function sendMove(from, to) {
    socket?.emit('move', from, to, null);
}

function sendMove(from, to, piece) {
    socket?.emit('move', from, to, piece);
}

function sendFen() {
    const fen = document.getElementById('ask-fen-input').value;
    if (fen !== "" && fen !== null && fen !== undefined) {
        socket?.emit('fen', fen);
        document.getElementById('ask-fen-input').value = "";
    }
    document.getElementById('ask-fen-popup').classList.remove('visible');
}

function resetGame() {
    socket?.emit('resetState');
}

function showCoordinates() {
    const checkbox = document.getElementById('showCoordinates');
    document.getElementById("chessboard").classList.toggle('show-coordinates', checkbox.checked);
}

function askFen() {
    document.getElementById('ask-fen-popup').classList.add('visible');
    setTimeout(() => document.getElementById('ask-fen-input').focus(), 100);
}

function displayAttemptResult(status, side) {
    const chessboard = document.getElementById("chessboard");
    if (status !== "ALLOWED") {
        document.getElementById('refused-popup-text').innerText = side;
        document.getElementById('refused-popup').classList.add('visible');
        setTimeout(() => document.querySelector('#refused-popup .popup-option').focus(), 100);
    } else if (side === 'b' && !Array.from(chessboard.classList).includes("rotated")) chessboard.classList.add('rotated');
    else if (side === 'w' && Array.from(chessboard.classList).includes("rotated")) chessboard.classList.remove('rotated');
    if (side !== '*') {
        document.getElementById('undo-button').classList.add('hidden');
    }
}

function hideAll() {
    document.getElementById('promotion-popup').classList.remove('visible');
    document.getElementById('state-popup').classList.remove('visible');
    document.getElementById('ask-fen-popup').classList.remove('visible');
    document.getElementById('ask-fen-input').value = "";
    document.getElementById('refused-popup').classList.remove('visible');
}

function watch() {
    const search = new URLSearchParams(window.location.search);
    window.open('/watch/?g=' + search.get('g'), '_self');
}

function undo() {
    socket?.emit('undo');
}

function resign() {
    document.getElementById("confirmation-popup").classList.add("visible");
    setTimeout(() => document.querySelector('#confirmation-popup .popup-option').focus(), 100);
}

function validateResign(validation=false) {
    document.getElementById("confirmation-popup").classList.remove("visible");
    if (validation) socket?.emit("resign");
}

document.getElementById('showCoordinates').onchange = showCoordinates;
showCoordinates();
let vocalMode = true;
startRec();

function toggleVocalMode() {
    const image = document.getElementById('toggle-vocal-button-image');
    if (vocalMode) {
        vocalMode = false;
        document.getElementById("toggle-vocal-button").classList.remove("vocal-active");
        image.src = "/public/assets/mic-off.svg";
        image.alt = "🔇";
    } else {
        vocalMode = true;
        image.src = "/public/assets/mic-on.svg";
        document.getElementById("toggle-vocal-button").classList.add("vocal-active");
        image.alt = "🎙️";   
        startRec();
    }

}

async function startRec() {
    vocalMode = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioCtx.destination);
        processor.onaudioprocess = (e) => {
            if (!vocalMode) {
                processor.onaudioprocess = (e) => {};
                return;
            }
            const input = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            socket?.emit("audio", pcm16.buffer);
        };
    } catch (e) {
        vocalMode = false;
        document.getElementById("toggle-vocal-button").classList.add("hidden");
    }
}

const authorized = 'abcdefgh12345678nqrb';
const typed = [];
let lastSquare = '';
let lastPromotion = null;

function isChessSquare(...chars) {
    const letters = authorized.slice(0, 8);
    if (letters.includes(chars[0]) && Number.isInteger(Number(chars[1])) && chars[1] >= 1 && chars[1] <= 8) return true;
    return false;
}

function isPromotionChar(char) {
    return 'nqrb'.includes(char);
}

window.addEventListener('keydown', e => {
    const finalKey = e.key.toLowerCase();
    if(finalKey === '0') {
        window.location.open('/', '_self');
    }
    if(finalKey === 'm') {
        typed.splice(0, typed.length);
        return;
    }
    if(!authorized.includes(finalKey)) return;

    const twoLast = [typed[typed.length - 1], finalKey];
    const isSquare = isChessSquare(...twoLast);
    const isPromotion = isPromotionChar(finalKey);
    if(isPromotion && !lastPromotion) {
        typed.splice(0, typed.length);
        lastPromotion = finalKey;
    }
    typed.push(finalKey);

    if(isSquare && lastSquare) {
        let finalPromotion = null;
        if(lastPromotion && typed.length === 5) finalPromotion = lastPromotion;
        sendMove(lastSquare, twoLast.join(''), finalPromotion);
        lastSquare = '';
        lastPromotion = null;
        typed.slice(0, typed.length);
    } else if(isSquare) lastSquare = twoLast.join('');
});
