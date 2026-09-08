import express, { Router } from "express"
import path from 'path';

const router = Router();

export default function() {
    router.get('/jouer', (_, res) => res.sendFile(path.join(process.cwd(), '/interface/disconnect4/play/play.html')));
    router.use('/jouer', express.static(path.join(process.cwd(), '/interface/disconnect4/play/')));
    router.get('/regarder', (_, res) => res.sendFile(path.join(process.cwd(), '/interface/disconnect4/watch/watch.html')));
    router.use('/regarder', express.static(path.join(process.cwd(), '/interface/disconnect4/watch/')));


    return router;
}