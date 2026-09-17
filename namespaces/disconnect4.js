import Connect4 from '../games/disconnect4/connect4.js';
import { recPuissance4, transform, grammarPuissance4, detectMenuCommand } from '../voice-recognition.js';

function fromTextToMove(nsp, text, address) {
    const ip = extractIP(address);
    if (!lastDisconnect4UserGamesId[ip]) return;
    const id = lastDisconnect4UserGamesId[ip];
    if (!disconnect4Games[id]) return;
    if (!disconnect4Games[id].isPlayer(ip)) return;

    const game = disconnect4Games[id];
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
        disconnect4Games[id] = new Connect4(game.getInvertedUser());
        nsp.to('game:' + id).emit('boardStates', disconnect4Games[id].getPositions());
        nsp.to('game:' + id).emit('legalColumns', disconnect4Games[id].getLegalColumns());
        nsp.to('game:' + id).emit('state', disconnect4Games[id].getState());
        return;
    }

    if (lowerCaseText.includes('non') || lowerCaseText.includes('annuler')) return;

    const regex = /colonne\s*([1-7])\b/;
    const match = lowerCaseText.match(regex);
    if (!match) return;

    const column = match[1];
    const result = game.play(ip, Number(column));
    game.displayBoard();

    nsp.to('game:' + id).emit('boardStates', game.getPositions());
    nsp.to('game:' + id).emit('state', game.getState());
    nsp.to('game:' + id).emit('legalColumns', game.getLegalColumns());
}


export const disconnect4Games = {};
const lastDisconnect4UserGamesId = {};

export default function disconnect4Namespace(io) {
    const nsp = io.of('/disconnect4');

    //startListening(fromTextToMove);

    nsp.on('connection', socket => {
        const { id } = socket.handshake.query;
        if (!id) return;
        const ip = extractIP(socket.handshake.headers['x-real-ip'] ?? socket.handshake.address);
        lastDisconnect4UserGamesId[ip] = id;
        disconnect4Games[id] = disconnect4Games[id] ?? new Connect4();

        const roomIdentifier = `game:${id}`;

        socket.join(roomIdentifier);
        socket.emit('boardStates', disconnect4Games[id].getPositions());
        socket.emit('legalColumns', disconnect4Games[id].getLegalColumns());
        socket.emit('state', disconnect4Games[id].getState());
        
        socket.on('move', (column) => {
            if (!disconnect4Games[id].isPlayer(ip))
                return;
            const legal = disconnect4Games[id].play(ip, Number(column));
            disconnect4Games[id].displayBoard();
            if (legal) {
                const moves = disconnect4Games[id].getLegalColumns();
                nsp.to(roomIdentifier).emit('legalColumns', moves);
                nsp.to(roomIdentifier).emit('boardStates', disconnect4Games[id].getPositions());
                nsp.to(roomIdentifier).emit('state', disconnect4Games[id].getState());
            } else {
                socket.emit('boardStates', disconnect4Games[id].getPositions());
                socket.emit('state', disconnect4Games[id].getState());
            }
        });

        socket.on('resetState', () => {
            if (!disconnect4Games[id].isPlayer(ip))
                return;
            disconnect4Games[id] = new Connect4(disconnect4Games[id].getInvertedUser());
            nsp.to(roomIdentifier).emit('boardStates', disconnect4Games[id].getPositions());
            nsp.to(roomIdentifier).emit('legalColumns', disconnect4Games[id].getLegalColumns());
            nsp.to(roomIdentifier).emit('state', disconnect4Games[id].getState());
            const room = io.of('/disconnect4').adapter.rooms.get('game:' + id);
            if (!room) return;
            room.forEach(socketId => {
                const s = io.of('/disconnect4').sockets.get(socketId)
                if (!s) return;
                if (disconnect4Games[id].isPlayer(extractIP(s.handshake.address))) {
                    s.emit("side", "ALLOWED", disconnect4Games[id].getPlayer(extractIP(s.handshake.address)));
                }
            });
        });

        socket.on('undo', () => {
            if (!disconnect4Games[id].isPlayer(ip) || disconnect4Games[id].getPlayer(ip) !== '*')
                return;
            disconnect4Games[id].undo();
            console.log('[' + id + '] going back !');
            disconnect4Games[id].displayBoard();
            nsp.to(roomIdentifier).emit('boardStates', disconnect4Games[id].getPositions());
            nsp.to(roomIdentifier).emit('legalColumns', disconnect4Games[id].getLegalColumns());
            nsp.to(roomIdentifier).emit('state', disconnect4Games[id].getState());
        });

        socket.on('may-play', roles => {
            const object = {
                status: "",
                side: ""
            }
            if (disconnect4Games[id].addPlayer(ip, roles)) {
                object.status = "ALLOWED";
                object.side = disconnect4Games[id].getPlayer(ip);
            } else {
                object.status = "REFUSED";
                object.side = "La partie est déjà remplie !";
            }
            socket.emit('side', object.status, object.side);
        });

        socket.on('resign', _ => {
            if (!disconnect4Games[id].isPlayer(ip))
                return;
            disconnect4Games[id].resign(disconnect4Games[id].getPlayer(ip));
            nsp.to(roomIdentifier).emit('state', disconnect4Games[id].getState());
        });

        // Receive audio flux
        socket.on('audio', async function (buffer) {
            if (!disconnect4Games[id].isPlayer(ip))
                return;
            const audioBuffer = Buffer.isBuffer(buffer)
                ? buffer
                : Buffer.from(buffer);
            const uint8 = new Uint8Array(audioBuffer);
            if (recPuissance4.acceptWaveform(uint8)) {
                const result = recPuissance4.result();
                if (result?.text) {
                    fromTextToMove(nsp, transform(result.text, grammarPuissance4), ip);
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