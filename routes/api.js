import express, { Router } from "express"
import path from 'path';
import { games } from '../namespaces/game.js';
import { Chess } from '../chess/chess.js';

const MAX_HOURS = 2;
const router = Router();

export default function() {

    router.get('/games', (req, res) => {
        const jsonList = [];

        const toDelete = [];
        Object.keys(games).forEach(id => {
            if (Date.now() - games[id].lastMoveTime > MAX_HOURS*3600000) // 2h / move
                toDelete.push(id);
        });
        toDelete.forEach(id => delete games[id]);
        Object.keys(games).forEach(game => {
            jsonList.push({
                name: game,
                playable: games[game].isPlayable()
            });
        });
        res.send(jsonList);
    });

    router.get('/create-game', (req, res) => {
        let i = 1;
        while (Object.keys(games).includes('ParaChess-' + i)) {
            i ++;
        }
        res.send({name: 'ParaChess-' + i});
    });

    return router;
}