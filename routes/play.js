import express, { Router } from "express"
import path from 'path';
import { games } from '../namespaces/game.js';

const router = Router();

export default function() {
    router.use('/', express.static(path.join(process.cwd(), '/interface/play/')));

    router.get('/', (_, res) => {
        res.sendFile(path.join(process.cwd(), '/interface/play/play.html'));
    });

    return router;
}