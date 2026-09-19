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

function fromTextToMove(nsp, text, address) {
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
        game.resign(game.getPlayer(ip));
        nsp.to('game:' + id).emit('state', game.getState());
        return;
    }

    if (lowerCaseText.includes('recommencer') || lowerCaseText.includes('rejouer')) {
        parachessGames[id].clear();
        parachessGames[id] = new Chess(createSendEval(ioRef, id), Chess.DEFAULT_FEN, game.getInvertedUser());
        nsp.to('game:' + id).emit('boardStates', parachessGames[id].getPositions());
        nsp.to('game:' + id).emit('legalMoves', parachessGames[id].getAllLegalMoves());
        nsp.to('game:' + id).emit('state', parachessGames[id].getState());
        nsp.to('game:' + id).emit('eval', parachessGames[id].getEval());
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

    console.log(lastParachessUserGamesId[ip] + " : " + squares[0] + "-" + squares[1] + " (" + piece + "): " + game.play(ip, squares[0], squares[1], piece));
    game.displayBoard();

    nsp.to('game:' + id).emit('boardStates', game.getPositions());
    nsp.to('game:' + id).emit('state', game.getState());
    nsp.to('game:' + id).emit('legalMoves', game.getAllLegalMoves());
}


export const parachessGames = {};
const lastParachessUserGamesId = {};
let ioRef = null;

export default function parachessNamespace(io) {
    ioRef = io;
    const nsp = io.of('/parachess');

    startListening(fromTextToMove);

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
            const legal = parachessGames[id].play(ip, from, to, promotion ?? "none");
            parachessGames[id].displayBoard();
            if (legal) {
                const moves = parachessGames[id].getAllLegalMoves();
                nsp.to(roomIdentifier).emit('legalMoves', moves);
                nsp.to(roomIdentifier).emit('boardStates', parachessGames[id].getPositions());
                nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());

                if(legal.storageSpot) {
                    nsp.to(roomIdentifier).emit('move', to, legal.storageSpot);
                }

                nsp.to(roomIdentifier).emit('move', from, to, promotion);
            } else {
                socket.emit('boardStates', parachessGames[id].getPositions());
                socket.emit('state', parachessGames[id].getState());
            }
        });

        socket.on('resetState', () => {
            if (!parachessGames[id].isPlayer(ip))
                return;
            parachessGames[id].clear();
            parachessGames[id] = new Chess(createSendEval(io, id), Chess.DEFAULT_FEN, parachessGames[id].getInvertedUser());
            nsp.to(roomIdentifier).emit('boardStates', parachessGames[id].getPositions());
            nsp.to(roomIdentifier).emit('legalMoves', parachessGames[id].getAllLegalMoves());
            nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());
            nsp.to(roomIdentifier).emit('eval', parachessGames[id].getEval());
            const room = io.of('/parachess').adapter.rooms.get('game:' + id);
            if (!room) return;
            room.forEach(socketId => {
                const s = io.of('/parachess').sockets.get(socketId)
                if (!s) return;
                if (parachessGames[id].isPlayer(extractIP(s.handshake.address))) {
                    s.emit("side", "ALLOWED", parachessGames[id].getPlayer(extractIP(s.handshake.address)));
                }
            });
        });

        socket.on('undo', () => {
            if (!parachessGames[id].isPlayer(ip) || parachessGames[id].getPlayer(ip) !== '*')
                return;
            parachessGames[id].undo(true, true);
            console.log('[' + id + '] going back !');
            parachessGames[id].displayBoard();
            nsp.to(roomIdentifier).emit('boardStates', parachessGames[id].getPositions());
            nsp.to(roomIdentifier).emit('legalMoves', parachessGames[id].getAllLegalMoves());
            nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());
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
            const object = {
                status: "",
                side: ""
            }
            if (parachessGames[id].addPlayer(ip, roles)) {
                object.status = "ALLOWED";
                object.side = parachessGames[id].getPlayer(ip);
            } else {
                object.status = "REFUSED";
                object.side = "La partie est déjà remplie !";
            }
            socket.emit('side', object.status, object.side);
        });

        socket.on('resign', _ => {
            if (!parachessGames[id].isPlayer(ip))
                return;
            parachessGames[id].resign(parachessGames[id].getPlayer(ip));
            nsp.to(roomIdentifier).emit('state', parachessGames[id].getState());
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
                    fromTextToMove(nsp, transform(result.text, grammarChess), ip);
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