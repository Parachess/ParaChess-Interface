import { Router } from "express"
import path from 'path';

const router = Router();

export default function() {
    router.get('/', (req, res) => {
        res.sendFile(path.join(process.cwd(), '/interface/games/games.html'))
    });

    return router;
}