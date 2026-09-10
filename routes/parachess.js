import express, { Router } from "express"
import path from 'path';

const router = Router();

export default function() {
    router.get('/jouer', (_, res) => res.sendFile(path.join(process.cwd(), '/interface/parachess/play/play.html')));
    router.use('/jouer', express.static(path.join(process.cwd(), '/interface/parachess/play')));
    router.get('/regarder', (req, res) => res.sendFile(path.join(process.cwd(), '/interface/parachess/watch/watch.html')));
    router.use('/regarder', express.static(path.join(process.cwd(), '/interface/parachess/watch')));
    return router;
}