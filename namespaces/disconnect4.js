import Connect4 from '../games/disconnect4/connect4.js';
import { recPuissance4, transform, grammarPuissance4, detectMenuCommand } from '../voice-recognition.js';

/**
 * Resigns a game a send a message to inform users
 * 
 * @param {*} nsp the namespace of the server
 * @param {string} id the id of a game
 * @param {string} ip the id of a player 
 * @param {string} team the team that wants to resign
 */
function resign(nsp, id, ip, team) {
    if (disconnect4Games[id].resign(ip, team))
        nsp.to('game:' + id).emit('state', disconnect4Games[id].getState());
}

/**
 * Reset a game
 * 
 * @param {*} nsp the namespace of the server 
 * @param {string} id the id of the game
 */
function restart(nsp, id) {
    disconnect4Games[id] = new Connect4(disconnect4Games[id].getSwappedTeams());
    const roomIdentifier = 'game:' + id;
    nsp.to(roomIdentifier).emit('boardStates', disconnect4Games[id].getPositions());
    nsp.to(roomIdentifier).emit('legalColumns', disconnect4Games[id].getLegalColumns());
    nsp.to(roomIdentifier).emit('state', disconnect4Games[id].getState());
    nsp.to(roomIdentifier).emit('resetBoard');
    const room = io.of('/disconnect4').adapter.rooms.get('game:' + id);
    if (!room) return;
    room.forEach(socketId => {
        const s = io.of('/disconnect4').sockets.get(socketId)
        if (!s) return;
        if (disconnect4Games[id].isPlayer(extractIP(s.handshake.address))) {
            s.emit("access", disconnect4Games[id].buildAccessObject(s.handshake.address));
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
    const legal = disconnect4Games[id].play(ip, Number(move?.column ?? -1));
    if (legal) {
        disconnect4Games[id].displayBoard();
        const moves = disconnect4Games[id].getLegalColumns();
        const roomIdentifier = 'game:' + id;
        nsp.to(roomIdentifier).emit('legalColumns', moves);
        nsp.to(roomIdentifier).emit('boardStates', disconnect4Games[id].getPositions());
        nsp.to(roomIdentifier).emit('state', disconnect4Games[id].getState());
    } else {
        socket.emit('boardStates', disconnect4Games[id].getPositions());
        socket.emit('state', disconnect4Games[id].getState());
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
    if (disconnect4Games[id].undo(ip)) {
        disconnect4Games[id].displayBoard();
        const roomIdentifier = 'game:' + id;
        nsp.to(roomIdentifier).emit('boardStates', disconnect4Games[id].getPositions());
        nsp.to(roomIdentifier).emit('legalColumns', disconnect4Games[id].getLegalColumns());
        nsp.to(roomIdentifier).emit('state', disconnect4Games[id].getState());
    }
}

function handleTextCommand(nsp, text, address) {
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
        resign(nsp, id, ip, game.getTeamsOfPlayer(ip)[0]);
        return;
    }

    if (lowerCaseText.includes('recommencer') || lowerCaseText.includes('rejouer')) {
        restart(nsp, id);
        return;
    }

    if (lowerCaseText.includes('non') || lowerCaseText.includes('annuler')) return;

    const regex = /colonne\s*([1-7])\b/;
    const match = lowerCaseText.match(regex);
    if (!match) return;
    move(nsp, socket, id, ip, { column: Number(match[1]) });
}


export const disconnect4Games = {};
const lastDisconnect4UserGamesId = {};

export default function disconnect4Namespace(io) {
    const nsp = io.of('/disconnect4');

    //startListening(handleTextCommand);

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
            move(nsp, socket, id, ip, { column : column });
        });

        socket.on('resetState', () => {
            if (!disconnect4Games[id].isPlayer(ip))
                return;
            restart(nsp, id, ip);
        });

        socket.on('undo', () => {
            if (!disconnect4Games[id].isPlayer(ip))
                return;
            undo(nsp, id, ip);
        });

        socket.on('may-play', roles => {
            disconnect4Games[id].addPlayer(ip, roles);
            socket.emit('access', disconnect4Games[id].buildAccessObject(ip));
        });

        socket.on('resign', team => {
            if (!disconnect4Games[id].isPlayer(ip))
                return;
            resign(nsp, id, ip, team);
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
                    handleTextCommand(nsp, transform(result.text, grammarPuissance4), ip);
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