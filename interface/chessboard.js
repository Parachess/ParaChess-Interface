const chessboard = document.getElementById("chessboard");
const promotions = document.getElementsByClassName("promotion");
const blank = document.querySelector(".blank");
const statePopup = document.querySelector('.popup.state');

const PIECES = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔"
};

const SYMBOLS = {
        "♟": "p",
        "♜": "r",
        "♞": "n",
        "♝": "b",
        "♛": "q",
        "♚": "k",
        "♙": "P",
        "♖": "R",
        "♘": "N",
        "♗": "B",
        "♕": "Q",
        "♔": "K"
};

const FULL_PIECES = {
    "♙": "♟",
    "♖": "♜",
    "♘": "♞",
    "♗": "♝",
    "♕": "♛",
    "♔": "♚",
    "♟": "♟",
    "♜": "♜",
    "♞": "♞",
    "♝": "♝",
    "♛": "♛",
    "♚": "♚",
};

const EMPTY_PIECES = {
    "♟": "♙",
    "♜": "♖",
    "♞": "♘",
    "♝": "♗",
    "♛": "♕",
    "♚": "♔",
    "♙": "♙",
    "♖": "♖",
    "♘": "♘",
    "♗": "♗",
    "♕": "♕",
    "♔": "♔"
};

const initialPieces = {
    0: ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜",],
    1: Array(8).fill("♟"),
    6: Array(8).fill("♙"),
    7: ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖",],
}
const PIECE_NAMES = {
    "♙": "Pion blanc", "♖": "Tour blanche", "♘": "Cavalier blanc", "♗": "Fou blanc", "♕": "Dame blanche", "♔": "Roi blanc",
    "♟": "Pion noir", "♜": "Tour noire", "♞": "Cavalier noir", "♝": "Fou noir", "♛": "Dame noire", "♚": "Roi noir",
    "p": "Pion noir", "r": "Tour noire", "n": "Cavalier noir", "b": "Fou noir", "q": "Dame noire", "k": "Roi noir",
    "P": "Pion blanc", "R": "Tour blanche", "N": "Cavalier blanc", "B": "Fou blanc", "Q": "Dame blanche", "K": "Roi blanc"
};

let positions = [];
let positionsIndex = 0;

let side = 'w';
let isDragging = false;
let drag = {
    piece: null,
    position: null,
    square: null,
    hasMoved: false
};
let select = {
    piece: null,
    position: null,
    square: null,
    legal: [],
};

document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    if (!drag.hasMoved) {
        drag.square.querySelector('.pieceContent').textContent = "";
        drag.hasMoved = true;
    }
    blank.style.left = e.clientX + "px";
    blank.style.top = e.clientY + "px";
});

document.addEventListener('mousedown', e => {
    const square = e.target.closest(".square");
    if (!square) return;
    const pos = square.dataset.pos;
    const piece = getSquare(square.dataset.pos);
    isDragging = true;
    drag.hasMoved = false;
    drag.piece = piece;
    drag.position = pos;
    drag.square = square;
    drag.square.childNodes[0].textContent = "";
    drag.square.classList.add("is-dragging");
    const white = Array.from(drag.square.getElementsByClassName("pieceContent")[0].classList).includes("white-piece");
    if (white) {
        blank.classList.remove("black-piece");
        blank.classList.add("white-piece");
    } else {
        blank.classList.add("black-piece");
        blank.classList.remove("white-piece");
    }
    applyLegalMoves(pos);
    showDraggingPiece(piece, square, e);
});

document.addEventListener("mouseup", e => {
    if (!isDragging) return;
    const square = e.target.closest(".square");
    if (square) {
        drop(square.dataset.pos);
        if ((select.legal !== [] && select.legal.includes(square.dataset.pos)) ||
            (legalMoves?.filter(move => move.from === drag.from).map(move => move.to) ?? []).includes(square.dataset.pos))
            updateSide();
    }
    blank.style.display = "none";
});

document.addEventListener('keydown', e => {
    const square = e.target.closest(".square");
    if (!square) return;

    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        handleSquareKeyboard(square);
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        const pos = square.dataset.pos;
        let file = pos.charCodeAt(0);
        let rank = parseInt(pos[1]);
        const rotated = chessboard.classList.contains('rotated');
        
        if (e.key === "ArrowUp") {
            rank += rotated ? -1 : 1;
        } else if (e.key === "ArrowDown") {
            rank += rotated ? 1 : -1;
        } else if (e.key === "ArrowLeft") {
            file += rotated ? 1 : -1;
        } else if (e.key === "ArrowRight") {
            file += rotated ? -1 : 1;
        }
        
        if (file >= 97 && file <= 104 && rank >= 1 && rank <= 8) {
            const newPos = String.fromCharCode(file) + rank;
            const newSquare = document.querySelector(`.square[data-pos="${newPos}"]`);
            if (newSquare) newSquare.focus();
        }
        if (file >= 97 && file <= 104 && rank >= 1 && rank <= 8) {
            const newPos = String.fromCharCode(file) + rank;
            const newSquare = document.querySelector(`.square[data-pos="${newPos}"]`);
            if (newSquare) {
                newSquare.focus();

                const piece = getSquare(newPos);
                if (piece && piece.trim() !== "") {
                    announce(`${PIECE_NAMES[piece] || 'Pièce'} en ${newPos}`);
                } else {
                    announce(`${newPos} vide`);
                }
            }
        }
    }
});



let announceTimeout = null;
let announceBuffer = [];

function announce(message) {
    if (!message) return;
    announceBuffer.push(message);
    if (announceTimeout) clearTimeout(announceTimeout);
    announceTimeout = setTimeout(() => {
        let announcer = document.getElementById('aria-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'aria-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.classList.add('visually-hidden');
            document.body.appendChild(announcer);
        }
        announcer.textContent = announceBuffer.join(" ");
        announceBuffer = [];
    }, 200);
}

function handleSquareKeyboard(square) {
    const pos = square.dataset.pos;
    const wasSelected = select.position !== null;
    
    drag.position = pos;
    drag.piece = getSquare(pos);
    drag.square = square;

    if (wasSelected && select.legal.includes(pos)) {
        const pieceMoved = select.piece;
        drop(pos);
        announce(`${PIECE_NAMES[pieceMoved] || 'Pièce'} déplacée en ${pos}`);
        if ((pieceMoved === "♙" && pos.includes("8")) || (pieceMoved === "♟" && pos.includes("1"))) {
            setTimeout(() => {
                const firstPromo = document.querySelector(".promotion");
                if (firstPromo) firstPromo.focus();
            }, 100);
        }
    } else if (wasSelected && pos === select.position) {
        resetSelect();
        clearLegalMoves();
        square.classList.remove("is-dragging");
        announce(`Sélection annulée`);
    } else {
        clearLegalMoves();
        resetSelect();
        const newPiece = getSquare(pos);
        if (newPiece && newPiece.trim() !== "") {
            applyLegalMoves(pos);
            drag.position = pos;
            drag.piece = newPiece;
            drag.square = square;
            initSelect(drag);
            announce(`${PIECE_NAMES[newPiece] || 'Pièce'} sélectionnée en ${pos}`);
            square.classList.add("is-dragging");
        } else {
            if (wasSelected) {
                announce(`Mouvement invalide vers ${pos}, sélection annulée.`);
            } else {
                announce(`Case ${pos} vide.`);
            }
        }
    }
}
/**
 * display the piece being dragged
 * @param {string} piece the piece being moved
 * @param {*} square the square from where the piece comes from
 * @param {*} e the mouse event
 */
function showDraggingPiece(piece, square, e) {
    blank.textContent = FULL_PIECES[piece];
    const squareRec = square.getBoundingClientRect()
    const left = e.clientX - squareRec.left;
    const top = e.clientY - squareRec.top;
    blank.style.transform = `translate(-${left}px, -${top}px)`
    blank.style.display = "flex";
    blank.style.left = e.clientX + "px";
    blank.style.top = e.clientY + "px";
}

/**
 * drop a piece
 */
async function drop(pos) {
    isDragging = false;
    if (pos !== drag.position) {
        drag.square.classList.remove("is-dragging");
        document.getElementById('rook-promotion').dataset.from = drag.position;
        document.getElementById('knight-promotion').dataset.from = drag.position;
        document.getElementById('bishop-promotion').dataset.from = drag.position;
        document.getElementById('queen-promotion').dataset.from = drag.position;
        document.getElementById('rook-promotion').dataset.to = pos;
        document.getElementById('knight-promotion').dataset.to = pos;
        document.getElementById('bishop-promotion').dataset.to = pos;
        document.getElementById('queen-promotion').dataset.to = pos;
        document.getElementById('rook-promotion').dataset.white = drag.piece === "♙";
        document.getElementById('knight-promotion').dataset.white = drag.piece === "♙";
        document.getElementById('bishop-promotion').dataset.white = drag.piece === "♙";
        document.getElementById('queen-promotion').dataset.white = drag.piece === "♙";
        if (drag.piece !== null && drag.piece !== "") {
            setSquare(pos, drag.piece);
            if (drag.square.getElementsByClassName("pieceContent").length > 0) {
                drag.square.getElementsByClassName("pieceContent")[0].classList.remove("white-piece");
                drag.square.getElementsByClassName("pieceContent")[0].classList.remove("black-piece");
            }
            const square = Array.from(document.getElementsByClassName('square')).filter(s => s.dataset.pos === pos)[0];
            if (Array.from(blank.classList).includes('white-piece')) {
                blank.classList.remove('white-piece');
                square.getElementsByClassName('pieceContent')[0].classList.remove('black-piece');
                square.getElementsByClassName('pieceContent')[0].classList.add('white-piece');
            } else {
                blank.classList.remove('black-piece');
                square.getElementsByClassName('pieceContent')[0].classList.remove('white-piece');
                square.getElementsByClassName('pieceContent')[0].classList.add('black-piece');
            }
            if ((drag.piece === "♙" && pos.includes("8")) || (drag.piece === "♟" && pos.includes("1"))) {
                document.getElementById("promotion-popup").classList.add('visible');
                setTimeout(() => {
                    const firstPromo = document.querySelector(".promotion");
                    if (firstPromo) firstPromo.focus();
                }, 100);
            } else {
                sendMove(drag.position, pos, "none");
            }
            resetSelect();
            clearLegalMoves();
        }
    } else {
        if (select.position === null) {
            initSelect(drag);
        }
        else if (select.legal.includes(drag.position)) {
            drag.square.classList.remove("is-dragging");
            select.square.classList.remove("is-dragging");
            document.getElementById('rook-promotion').dataset.from = select.position;
            document.getElementById('knight-promotion').dataset.from = select.position;
            document.getElementById('bishop-promotion').dataset.from = select.position;
            document.getElementById('queen-promotion').dataset.from = select.position;
            document.getElementById('rook-promotion').dataset.to = drag.position;
            document.getElementById('knight-promotion').dataset.to = drag.position;
            document.getElementById('bishop-promotion').dataset.to = drag.position;
            document.getElementById('queen-promotion').dataset.to = drag.position;
            document.getElementById('rook-promotion').dataset.white = select.piece === "♙";
            document.getElementById('knight-promotion').dataset.white = select.piece === "♙";
            document.getElementById('bishop-promotion').dataset.white = select.piece === "♙";
            document.getElementById('queen-promotion').dataset.white = select.piece === "♙";
            clearLegalMoves();
            setSquare(select.position, "");
            if ((select.piece === "♙" && pos.includes("8")) || (select.piece === "♟" && pos.includes("1"))) {
                document.getElementById('promotion-popup').classList.add('visible');
                setTimeout(() => {
                    const firstPromo = document.querySelector(".promotion");
                    if (firstPromo) firstPromo.focus();
                }, 100);
            } else {
                sendMove(select.position, pos, "none");
                setSquare(pos, select.piece);
            }
            clearLegalMoves();
            resetSelect();
        } else
            initSelect(drag);
    }
    resetDrag();
}

window.addEventListener('keydown', e => {
    if (e.key === 'w') {
        chessboard.classList.toggle('rotated');
        updateCoordLabels();
    } else if (e.keyCode === 37 && positionsIndex > 0) {
        positionsIndex -= 1;
        setChessBoard();
    } else if (e.keyCode === 39 && positionsIndex < positions.length - 1) {
        positionsIndex += 1;
        setChessBoard();
    }
});


function promote(e, piece) {
    const index = e.currentTarget.dataset.white === "true" ? piece.toUpperCase() : piece.toLowerCase();
    setSquare(e.currentTarget.dataset.to, PIECES[index]);
    sendMove(e.currentTarget.dataset.from, e.currentTarget.dataset.to, piece);
    document.getElementById("promotion-popup").classList.remove("visible");
}

/**
 * give values to select
 * @param {*} drag the drag object
 */
function initSelect(drag) {
    select.square?.classList.remove('is-dragging');
    if (drag.piece !== null && drag.piece !== "") {
        select.piece = drag.piece.valueOf();
        select.position = drag.position.valueOf();
        select.square = drag.square.valueOf();
        select.legal = []
        const squares = document.getElementsByClassName("square");
        Array.from(squares).forEach(square => {
            if (Array.from(square.classList).includes('legal'))
                select.legal.push(square.dataset.pos);
        });
        setSquare(drag.position, select.piece);
    } else {
        resetSelect();
        drag.square?.classList.remove("is-dragging");
    }
}

/**
 * reset the drag variables
 */
function resetDrag() {
    drag.position = null;
    drag.piece = null;
    drag.square = null;
    drag.hasMoved = false;
}

/**
 * reset the select variables
 */
function resetSelect() {
    select.square?.classList.remove('is-dragging');
    select.piece = null;
    select.position = null;
    select.square = null;
    select.legal = [];
}

/**
 * create the initial board and interact with it
 */
function createBoard() {
    chessboard.setAttribute('role', 'application');
    chessboard.setAttribute('aria-label', 'Échiquier');
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const pos = 'abcdefgh'[col] + String(8 - row);
            const square = document.createElement("div");

            square.dataset.pos = pos;
            square.setAttribute("tabindex", "0");
            square.classList.add("square");
            square.classList.add((row + col) % 2 === 0 ? "light" : "dark");
            const piece = initialPieces[row] ? initialPieces[row][col] : null;
            const white = ["♙", "♖", "♘","♗", "♕", "♔"].includes(piece);
            const black = ["♟", "♜", "♞", "♝", "♛", "♚"].includes(piece);
            const pieceElem = document.createElement('div');
            pieceElem.classList.add('pieceContent');
            if (white) pieceElem.classList.add('white-piece');
            else if (black) pieceElem.classList.add('black-piece');
            if (piece) {
                pieceElem.textContent = FULL_PIECES[piece] ?? piece;
                square.setAttribute("aria-label", `${PIECE_NAMES[piece] || 'Pièce'} en ${pos}`);
            } else {
                square.setAttribute("aria-label", `${pos} vide`);
            }
            square.appendChild(pieceElem);
            chessboard.appendChild(square);

            const text = document.createElement('p');
            text.classList.add('squareText')
            text.textContent = pos;
            square.appendChild(text)
        }
    }
    connection();
    updateCoordLabels();
    positions.push(this.exportChessBoardObject());
}

function updateCoordLabels() {
    const squares = [...chessboard.querySelectorAll('.square')],
        rankLabels = document.querySelectorAll('.rank-label'),
        fileLabels = document.querySelectorAll('.file-label'),
        isRotated = chessboard.classList.contains('rotated');

    for (let i = 0; i < 8; i++) {
        const rankSquare = isRotated ? squares[63 - i * 8] : squares[i * 8],
            fileSquare = isRotated ? squares[7 - i] : squares[56 + i];

        rankLabels[i].textContent = rankSquare.querySelector('.squareText').textContent[1];
        fileLabels[i].textContent = fileSquare.querySelector('.squareText').textContent[0];
    }
}
/**
 * get the piece positioned on a certain square
 * 
 * @returns the piece
 * 
 */
function getSquare(pos) {
    const white = Array.from(document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).classList).includes('white-piece')
    const piece = document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).textContent;
    return white ? EMPTY_PIECES[piece] : piece;
}

/**
 * change the piece of a square
 */
function setSquare(pos, piece) {
    const white = ["♙", "♖", "♘", "♗", "♕", "♔"].includes(piece);
    const black = ["♟", "♜", "♞", "♝", "♛", "♚"].includes(piece);
    if (white) {
        document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).classList.remove("black-piece");
        document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).classList.add("white-piece");
    } else if (black) {
        document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).classList.add("black-piece");
        document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).classList.remove("white-piece");
    } else {
        document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).classList.remove("white-piece");
        document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).classList.remove("black-piece");
    }
    document.querySelector(`.square[data-pos="${pos}"] .pieceContent`).textContent = FULL_PIECES[piece];

    const squareElem = document.querySelector(`.square[data-pos="${pos}"]`);
    if (piece && piece.trim() !== "") {
        squareElem.setAttribute("aria-label", `${PIECE_NAMES[piece] || 'Pièce'} en ${pos}`);
    } else {
        squareElem.setAttribute("aria-label", `${pos} vide`);
    }
}

function applyLegalMoves(from) {
    const to = legalMoves?.filter(move => move.from === from).map(move => move.to) ?? [];
    const squares = document.querySelectorAll('.square');
    for (const square of squares) {
        square.classList.remove('legal');
        if (to.includes(square.dataset.pos))
            square.classList.add('legal');
    }
}

function clearLegalMoves() {
    const squares = document.querySelectorAll('.square.legal');
    for (const square of squares) {
        square.classList.remove('legal');
    }
}

/**
 * update player display for the next turn
 */
function updateSide() {
    if (side === 'w') {
        document.getElementById("side").textContent = "Trait au noir.";
        side = 'b';
        document.getElementById("side").classList.add("black-turn");
        document.getElementById("side").classList.remove("white-turn");
    } else {
        document.getElementById("side").textContent = "Trait au blanc.";
        side = 'w';
        document.getElementById("side").classList.add("white-turn");
        document.getElementById("side").classList.remove("black-turn");
    }
}

function showState(text) {
    document.getElementById('state-popup-title').textContent = text;
    document.getElementById('state-popup').classList.add('visible');
    setTimeout(() => document.querySelector('#state-popup .popup-option').focus(), 100);
}

function goToMenu() {
    window.open('/games/', '_self');
}

function setChessBoard() {
    let oldCount = 0;
    let newCount = 0;
    let from = null;
    let to = null;
    let movedSym = null;

    if (positionsIndex > 0 && positions[positionsIndex - 1]) {
        const oldState = positions[positionsIndex - 1];
        const newState = positions[positionsIndex];
        
        for (const sym of Object.values(oldState)) {
            if (sym) oldCount++;
        }
        for (const sym of Object.values(newState)) {
            if (sym) newCount++;
        }

        const allSquares = new Set([...Object.keys(oldState), ...Object.keys(newState)]);
        const appeared = [];
        const disappeared = [];

        for (const sq of allSquares) {
            const oldSym = oldState[sq];
            const newSym = newState[sq];
            if (oldSym !== newSym) {
                if (newSym && !oldSym) appeared.push({sq, sym: newSym});
                else if (newSym && oldSym) appeared.push({sq, sym: newSym, captured: oldSym});
                else if (!newSym && oldSym) disappeared.push({sq, sym: oldSym});
            }
        }

        if (appeared.length === 1) {
            to = appeared[0].sq;
            movedSym = appeared[0].sym;
            const fromSq = disappeared.find(d => d.sym === movedSym) || disappeared[0];
            if (fromSq) from = fromSq.sq;
        } else if (appeared.length === 2) {
            announce("Roque effectué.");
        }
    }

    for (const [square, symbol] of Object.entries(positions[positionsIndex])) {
        setSquare(square, PIECES[symbol]);
    }

    if (from && to && movedSym) {
        announce(`${PIECE_NAMES[PIECES[movedSym]] || 'Pièce'} déplacé de ${from} à ${to}.`);
    }

    if (oldCount > newCount) {
        announce("Pièce capturée !");
    }
    
    if (typeof updateCapturedPieces === 'function') {
        updateCapturedPieces();
    }
}

function exportChessBoardObject() {
    const squares = document.querySelectorAll('.square');
    const chessboard = {};
    for (const square of squares) {
        const piece = document.querySelector(`.square[data-pos="${square.dataset.pos}"] .pieceContent`).textContent;
        if (Array.from(square.getElementsByClassName("pieceContent")[0].classList).includes("white-piece")) {
            chessboard[square.dataset.pos] = SYMBOLS[EMPTY_PIECES[piece]];
        } else {
            chessboard[square.dataset.pos] = SYMBOLS[piece];
        }
    }
    return chessboard;
}

function updateCapturedPieces() {
    const initialCounts = {
        P: 8, R: 2, N: 2, B: 2, Q: 1, K: 1,
        p: 8, r: 2, n: 2, b: 2, q: 1, k: 1
    };
    const currentCounts = {};
    if (!positions || positions.length === 0 || !positions[positionsIndex]) return;
    for (const symbol of Object.values(positions[positionsIndex])) {
        if (!currentCounts[symbol]) currentCounts[symbol] = 0;
        currentCounts[symbol]++;
    }
    
    const capturedByWhite = [];
    for (const sym of ['q', 'r', 'b', 'n', 'p']) {
        let diff = (initialCounts[sym] || 0) - (currentCounts[sym] || 0);
        if (diff > 0) {
            if (diff > 1) {
                capturedByWhite.push(`<span class="captured-group">${PIECES[sym]}<span class="captured-count">x${diff}</span></span>`);
            } else {
                capturedByWhite.push(`<span class="captured-group">${PIECES[sym]}</span>`);
            }
        }
    }

    const capturedByBlack = [];
    for (const sym of ['Q', 'R', 'B', 'N', 'P']) {
        let diff = (initialCounts[sym] || 0) - (currentCounts[sym] || 0);
        if (diff > 0) {
            if (diff > 1) {
                capturedByBlack.push(`<span class="captured-group">${PIECES[sym]}<span class="captured-count">x${diff}</span></span>`);
            } else {
                capturedByBlack.push(`<span class="captured-group">${PIECES[sym]}</span>`);
            }
        }
    }

    const whiteDiv = document.getElementById("captured-by-white");
    const blackDiv = document.getElementById("captured-by-black");
    if (whiteDiv) whiteDiv.innerHTML = capturedByWhite.join(" ");
    if (blackDiv) blackDiv.innerHTML = capturedByBlack.join(" ");
}

createBoard();
const search = new URLSearchParams(window.location.search);
if (search.has('g') && document.getElementById('game-id-span')) {
    document.getElementById('game-id-span').textContent = search.get('g');
}


const keyPressed = {};
let isFacialDetectionActivate = 0;
window.addEventListener('keydown', e => {
    keyPressed[e.key] = true;
    if (keyPressed['Control'] && keyPressed['Alt']) {
        if (e.key === 'm'){
            toggleVocalMode(); // Activer Micro
        }
        else if ( e.key === 'c'){ 
            if (isFacialDetectionActivate === 0){
                isFacialDetectionActivate = 1;
                activateFacialDetection(); // Activer Détection faciale
            }
            else{
                isFacialDetectionActivate = 0;
                deactivateFacialDetection(); // Désactiver Détection faciale
            }
        }
        else if (e.key === 'r'){
            window.open(window.location.origin, '_self'); // Pour retourner au menu
        }
        else if (e.key === 'i'){
        resetGame(); // Pour recommencer la partie
        }
        else if (e.key === 'j'){
        undo(); // Pour annuler le coup
        }
        else if ( e.key === 'u'){
        socket?.emit("resign"); // Pour abandonner la partie
        }
        else if (e.key == 'b'){
            const caseCoteBlanc = document.querySelector(`.square[data-pos="e2"]`);
            caseCoteBlanc.focus();
        }
        else if (e.key == 'n'){
            const caseCoteNoir = document.querySelector(`.square[data-pos="e7"]`);
            caseCoteNoir.focus();
        }
    }
})


window.addEventListener('keyup', (event) => {
    delete keyPressed[event.key];
});