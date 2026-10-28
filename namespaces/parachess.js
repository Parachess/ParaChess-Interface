import { Chess, PROMOTIONS_PIECES_NAME } from '../games/parachess/chess.js';
import { recChess, transform, grammarChess, startListening, detectMenuCommand } from '../voice-recognition.js';

function createSendEval(io, gameId) {
    return function (payload) {
        const room = io.of('/parachess').adapter.rooms.get('game:' + gameId);
        if (!room) return;
        room.forEach(socketId => {
            const s = io.of('/parachess').sockets.get(socketId)
            if (!s) return;
            if (!parachessGames[gameId].isPlayer(s.handshake.address)) {
                s.emit("eval", payload);
            }
        });
    };
}

/**
 * Resigns a game a send a message to inform users
 * 
 * @param {*} nsp the namespace of the server
 * @param {string} id the id of a game
 * @param {string} ip the id of a player 
 * @param {string} team the team that wants to resign
 */
function resign(nsp, id, ip, team) {
    if (parachessGames[id].resign(ip, team))
        nsp.to('game:' + id).emit('state', parachessGames[id].getState());
}

/**
 * Reset a game
 * 
 * @param {*} nsp the namespace of the server 
 * @param {string} id the id of the game
 */
function restart(nsp, id) {
    parachessGames[id].clear();
    parachessGames[id] = new Chess(parachessGames[id].getSwappedTeams());
    const roomIdentifier = 'game:' + id;
    nsp.to(roomIdentifier).emit('boardStates', parachessGames[id].getPositions());
    nsp.to(roomIdentifier).emit('legalColumns', parachessGames[id].getLegalColumns());
    nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());
    nsp.to(roomIdentifier).emit('resetBoard');
    const room = io.of('/disconnect4').adapter.rooms.get('game:' + id);
    if (!room) return;
    room.forEach(socketId => {
        const s = io.of('/disconnect4').sockets.get(socketId)
        if (!s) return;
        if (parachessGames[id].isPlayer(extractIP(s.handshake.address))) {
            s.emit("access", parachessGames[id].buildAccessObject(s.handshake.address));
        }
    });
}

/**
 * Tries to make a move
 * 
 * @param {*} nsp the namespace of the server
 * @param {*} socket the particular socket attempting to move
 * @param {string} id the id of the game
 * @param {string} ip the id of the player
 * @param {object} move the move object (currently: {column : Int(0-7)})
 */
function move(nsp, socket, id, ip, move) {
    const legal = parachessGames[id].play(ip, Number(move?.column ?? -1));
    if (legal) {
        parachessGames[id].displayBoard();
        const moves = parachessGames[id].getLegalColumns();
        const roomIdentifier = 'game:' + id;
        nsp.to(roomIdentifier).emit('legalColumns', moves);
        nsp.to(roomIdentifier).emit('boardStates', parachessGames[id].getPositions());
        nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());
    } else {
        socket.emit('boardStates', parachessGames[id].getPositions());
        socket.emit('state', parachessGames[id].getState());
    }
}

/**
 * Tries to undo a move
 * 
 * @param {*} nsp the namespace of the server 
 * @param {string} id the id of a game 
 * @param {string} ip the id of the player whishing to undo a move
 */
function undo(nsp, id, ip) {
    if (parachessGames[id].undo(ip)) {
        parachessGames[id].displayBoard();
        const roomIdentifier = 'game:' + id;
        nsp.to(roomIdentifier).emit('boardStates', parachessGames[id].getPositions());
        nsp.to(roomIdentifier).emit('legalColumns', parachessGames[id].getLegalColumns());
        nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());
    }
}

function handleTextCommand(nsp, text, address) {
    const ip = extractIP(address);

    if (!lastParachessUserGamesId[ip]) return;
    const id = lastParachessUserGamesId[ip];
    if (!parachessGames[id]) return;
    if (!parachessGames[id].isPlayer(ip)) return;

    const game = parachessGames[id];
    const lowerCaseText = text.toLowerCase();

    const menuCommand = detectMenuCommand(lowerCaseText);
    if (menuCommand) {
        nsp.to('game:' + id).emit('voice-command', menuCommand);
        return;
    }

    if (lowerCaseText.includes('abandonner')) {
        resign(nsp, id, ip, game.getTeamsOfPlayer(ip)[0]);
        return;
    }

    if (lowerCaseText.includes('recommencer') || lowerCaseText.includes('rejouer')) {
        restart(nsp, id);
        return;
    }
    
    const regex = /\b([a-h])\s?([1-8])\b/g;
    const squares = [...lowerCaseText.matchAll(regex)].map(m => m[1] + m[2]);

    if (lowerCaseText.includes('non') || lowerCaseText.includes('annuler')) return;

    if (!squares || squares.length < 2) return;

    const lastSquareIndex = lowerCaseText.lastIndexOf(squares[1]);
    let firstPieceIndex = -1;
    PROMOTIONS_PIECES_NAME.forEach(piece => {
        const index = lowerCaseText.indexOf(piece, lastSquareIndex);
        if (index > -1 && (firstPieceIndex > index || firstPieceIndex === -1))
            firstPieceIndex = index;
    });

    let piece = "none";
    if (firstPieceIndex > -1) {
        if (lowerCaseText[firstPieceIndex] === 'c') piece = "n";        // Knight
        else if (lowerCaseText[firstPieceIndex] === 'f') piece = "b";   // Bishop
        else if (lowerCaseText[firstPieceIndex] === 'd') piece = "q";   // Queen
        else piece = "r";                                               // Rook
    }
    move(nsp, socket, id, ip, { from: squares[0], to: squares[1], promotion: piece});
}


export const parachessGames = {};
const lastParachessUserGamesId = {};

export default function parachessNamespace(io) {
    const nsp = io.of('/parachess');

    startListening(handleTextCommand);

    nsp.on('connection', socket => {
        const { id } = socket.handshake.query;
        if (!id) return;
        const ip = extractIP(socket.handshake.headers['x-real-ip'] ?? socket.handshake.address);
        lastParachessUserGamesId[ip] = id;
        parachessGames[id] = parachessGames[id] ?? new Chess(createSendEval(io, id));
        const roomIdentifier = `game:${id}`;

        socket.join(roomIdentifier);
        socket.emit('boardStates', parachessGames[id].getPositions());
        socket.emit('legalMoves', parachessGames[id].getAllLegalMoves());
        socket.emit('state', parachessGames[id].getState());
        if (!parachessGames[id].isPlayer(ip))
            socket.emit('eval', parachessGames[id].getEval());

        socket.on('move', (from, to, promotion) => {
            if (!parachessGames[id].isPlayer(ip))
                return;
            move(nsp, socket, id, ip, { from: from, to: to, promotion: promotion });
        });

        socket.on('resetState', () => {
            if (!parachessGames[id].isPlayer(ip))
                return;
            restart(nsp, id);
        });

        socket.on('undo', () => {
            if (!parachessGames[id].isPlayer(ip))
                return;
            undo(nsp, id, ip);
        });

        socket.on('fen', fen => {
            if (!parachessGames[id].isPlayer(ip))
                return;
            parachessGames[id].clear();
            parachessGames[id] = new Chess(createSendEval(io, id), fen);
            console.log('[!] Forcing \"' + id + "\" to position : \"" + fen + "\"");
            nsp.to(roomIdentifier).emit('boardStates', parachessGames[id].getPositions());
            nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());
            const moves = parachessGames[id].getAllLegalMoves();
            nsp.to(roomIdentifier).emit('legalMoves', moves);
        });

        socket.on('may-play', roles => {
            parachessGames[id].addPlayer(ip, roles);
            socket.emit('access', parachessGames[id].buildAccessObject(id, ip));
        });

        socket.on('resign', team => {
            if (!parachessGames[id].isPlayer(ip))
                return;
            resign(nsp, id, ip, team);
        });

        // Receive audio flux
        socket.on('audio', async function (buffer) {
            if (!parachessGames[id].isPlayer(ip))
                return;
            const audioBuffer = Buffer.isBuffer(buffer)
                ? buffer
                : Buffer.from(buffer);
            const uint8 = new Uint8Array(audioBuffer);
            if (recChess.acceptWaveform(uint8)) {
                const result = recChess.result();
                if (result?.text) {
                    handleTextCommand(nsp, transform(result.text, grammarChess), ip);
                }
            }
        });
    });

    return nsp;
}

/**
 * extract an IP from a complex address
 * 
 * @param {string} address the address
 * @returns {string} the IP
 */
function extractIP(address) {
    if (!address) return null;
    address = address.replace(/^\[|\]$/g, '');
    if (address.includes(':')) {
        if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(address)) {
            address = address.split(':')[0];
        }
    }
    if (address.startsWith('::ffff:')) {
        address = address.substring(7);
    }
    return address;
}