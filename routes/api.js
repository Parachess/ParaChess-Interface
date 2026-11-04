import express, { Router } from "express"
import path from 'path';
import { parachessGames } from '../namespaces/parachess.js';
import { disconnect4Games } from '../namespaces/disconnect4.js';
import { Chess } from '../games/parachess/chess.js';
import { deflate } from "zlib";

const games = [
    {
        name: "ParaChess",
        url: "parachess",
        char1: '♕',
        char2: '♔',
        askFen: true,
        maxHours: 2,
        games: parachessGames
    },
    {
        name: "DiscConnect 4",
        url: "disconnect4",
        char1: '🔴',
        char2: '🔵',
        askFen: false,
        maxHours: .25,
        games: disconnect4Games
    }
];

const CHESS_MAX_HOURS = 2;
const CONNECT4_MAX_HOURS = .25;
const router = Router();

export default function() {

    router.get('/games', (req, res) => {
        let gamesURL = []
        games.forEach(game =>  gamesURL.push(game.url));
        res.send(gamesURL);
    });

    router.get('/:game/game', (req, res) => {
        const gameURL = req.params.game;
        let jsonGame = {};
        const toDelete = [];
        let found = false;
        for (let i = 0; i < games.length; i++) {
            if (games[i].url !== gameURL)
                continue;
            found = true;
            jsonGame = {
                name: games[i].name,
                url: games[i].url,
                char1: games[i].char1,
                char2: games[i].char2,
                askFen: games[i].askFen,
                maxHours: games[i].maxHours
            }
            break;
        }
        const result = found ? { 'status': 'ok', 'game': jsonGame } : { 'status': 'error', 'error': 'Jeu inconnu: "' + gameURL + '"' };
        res.send(result);
    });

    router.get('/:game/games', (req, res) => {
        const gameURL  = req.params.game;
        const jsonList = [];
        const toDelete = [];
        let found = false;
        for (let i = 0; i < games.length; i++) {
            if (games[i].url !== gameURL)
                continue;
            found = true;
            toDelete.splice(0, toDelete.length);
            Object.keys(games[i].games).forEach(id => {
                if (Date.now() - games[i].games[id].lastMoveTime > games[i].maxHours * 3600000)
                    toDelete.push(id);
            });
            toDelete.forEach(id => delete games[i].games[id]);
            Object.keys(games[i].games).forEach(game => {
                jsonList.push({
                    name: game,
                    playable: games[i].games[game].isPlayable(extractIP(req.headers['x-real-ip'] ?? req.socket.address().address))
                });
            });
            break;
        }
        const result = found ? {'status': 'ok', 'games': jsonList } : {'status': 'error', 'error': 'Jeu inconnu: "' + gameURL + '"'};
        res.send(jsonList);
    });

    router.get('/:game/create-game', (req, res) => {
        const gameURL = req.params.game;
        let validName = null;
        let found = false;
        let j = 1;
        for (let i = 0; i < games.length; i++) {
            if (games[i].url !== gameURL)
                continue;
            found = true;
            while (Object.keys(games[i].games).includes(games[i].name + '-' + j)) {
                j++;
            }
            validName = games[i].name + '-' + j;
            break;
        }
        const result = found ? {'status': 'ok', 'name': validName} : {'status': 'error', 'error': 'Jeu inconnu: "' + gameURL + '"'};
        res.send(result);
    });

    return router;
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