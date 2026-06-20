import { Router } from "express"
import path from 'path';

const router = Router();

export default function() {
    router.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(process.cwd(), '/interface/index.html'))
    });

    return router;
}