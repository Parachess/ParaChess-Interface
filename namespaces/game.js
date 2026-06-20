import { Chess, PROMOTIONS_PIECES_NAME } from '../chess/chess.js';
import { rec, startListening, transform } from '../receive-audio.js';

function createSendEval(io, gameId) {
    return function (payload) {
        const room = io.of('/game').adapter.rooms.get('game:' + gameId);
        if (!room) return;
        room.forEach(socketId => {
            const s = io.of('/game').sockets.get(socketId)
            if (!s) return;
            if (!games[gameId].isPlayer(s.handshake.address)) {
                s.emit("eval", payload);
            }
        });
    };
}

function fromTextToMove(nsp, text, address) {
    const ip = extractIP(address);

    if (!lastUserGamesId[ip]) return;
    const id = lastUserGamesId[ip];
    if (!games[id]) return;
    if (!games[id].isPlayer(ip)) return;

    const game = games[id];
    const lowerCaseText = text.toLowerCase();
    const regex = /\b[a-h][1-8]\b/g;
    const squares = lowerCaseText.match(regex);

    if (lowerCaseText.includes('non') || lowerCaseText.includes('annuler')) return;

    if (!squares || squares?.length < 2) return;

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

    console.log(lastUserGamesId[ip] + " : " + squares[0] + "-" + squares[1] + " (" + piece + "): " + game.play("PARACHESS", squares[0], squares[1], piece));
    game.displayBoard();

    nsp.to('game:' + id).emit('boardStates', game.getPositions());
    nsp.to('game:' + id).emit('state', game.getState());
    nsp.to('game:' + id).emit('legalMoves', game.getAllLegalMoves());
}


export const games = { ParaChessDefaultGame: new Chess() };

const lastUserGamesId = { Parachess: "ParaChessDefaultGame" };

export default function gameNamespace(io) {
    games.ParaChessDefaultGame.onEval = createSendEval(io, 'live');
    const nsp = io.of('/game');

    startListening(fromTextToMove);

    nsp.on('connection', socket => {
        const { id } = socket.handshake.query;
        if (!id) return;
        const ip = extractIP(socket.handshake.address);
        lastUserGamesId[ip] = id;
        games[id] = games[id] ?? new Chess(createSendEval(io, id));

        const roomIdentifier = `game:${id}`;

        socket.join(roomIdentifier);
        socket.emit('boardStates', games[id].getPositions());
        socket.emit('legalMoves', games[id].getAllLegalMoves());
        socket.emit('state', games[id].getState());
        if (!games[id].isPlayer(ip))
            socket.emit('eval', games[id].getEval());

        socket.on('move', (from, to, promotion) => {
            const legal = games[id].play(ip, from, to, promotion ?? "none");
            games[id].displayBoard();
            if (legal) {
                const moves = games[id].getAllLegalMoves();
                nsp.to(roomIdentifier).emit('legalMoves', moves);
                nsp.to(roomIdentifier).emit('boardStates', games[id].getPositions());
                nsp.to(roomIdentifier).emit('state', games[id].getState());
                nsp.to(roomIdentifier).emit('move', from, to, promotion)
            } else {
                socket.emit('boardStates', games[id].getPositions());
                socket.emit('state', games[id].getState());
            }
        });

        socket.on('resetState', () => {
            if (!games[id].isPlayer(ip))
                return;
            games[id].clear();
            games[id] = new Chess(createSendEval(io, id), Chess.DEFAULT_FEN, games[id].getInvertedUser());
            nsp.to(roomIdentifier).emit('boardStates', games[id].getPositions());
            nsp.to(roomIdentifier).emit('legalMoves', games[id].getAllLegalMoves());
            nsp.to(roomIdentifier).emit('state', games[id].getState());
            nsp.to(roomIdentifier).emit('eval', games[id].getEval());
            const room = io.of('/game').adapter.rooms.get('game:' + id);
            if (!room) return;
            room.forEach(socketId => {
                const s = io.of('/game').sockets.get(socketId)
                if (!s) return;
                if (games[id].isPlayer(extractIP(s.handshake.address))) {
                    s.emit("side", "ALLOWED", games[id].getPlayer(extractIP(s.handshake.address)));
                }
            });
        });

        socket.on('undo', () => {
            if (!games[id].isPlayer(ip) || games[id].getPlayer(ip) !== '*')
                return;
            games[id].undo(true, true);
            console.log('[' + id + '] going back !');
            games[id].displayBoard();
            nsp.to(roomIdentifier).emit('boardStates', games[id].getPositions());
            nsp.to(roomIdentifier).emit('legalMoves', games[id].getAllLegalMoves());
            nsp.to(roomIdentifier).emit('state', games[id].getState());
        });

        socket.on('fen', fen => {
            if (!games[id].isPlayer(ip))
                return;
            games[id].clear();
            games[id] = new Chess(createSendEval(io, id), fen);
            console.log('[!] Forcing \"' + id + "\" to position : \"" + fen + "\"");
            nsp.to(roomIdentifier).emit('boardStates', games[id].getPositions());
            nsp.to(roomIdentifier).emit('state', games[id].getState());
            const moves = games[id].getAllLegalMoves();
            nsp.to(roomIdentifier).emit('legalMoves', moves);
        });

        socket.on('may-play', () => {
            const object = {
                status: "",
                side: ""
            }
            if (games[id].addPlayer(ip)) {
                object.status = "ALLOWED";
                object.side = games[id].getPlayer(ip);
            } else {
                object.status = "REFUSED";
                object.side = "La partie est déjà remplie !";
            }
            socket.emit('side', object.status, object.side);
        });

        socket.on('resign', fen => {
            if (!games[id].isPlayer(ip))
                return;
            games[id].resign(games[id].getPlayer(ip));
            nsp.to(roomIdentifier).emit('state', games[id].getState());
        });

        // Receive audio flux
        socket.on('audio', async function (buffer) {
            if (!games[id].isPlayer(ip))
                return;
            const audioBuffer = Buffer.isBuffer(buffer)
                ? buffer
                : Buffer.from(buffer);
            const uint8 = new Uint8Array(audioBuffer);
            if (rec.acceptWaveform(uint8)) {
                const result = rec.result();
                if (result?.text) {
                    fromTextToMove(nsp, transform(result.text), ip);
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