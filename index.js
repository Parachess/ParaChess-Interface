import api from './routes/api.js';
import path from 'path';
import home from './routes/home.js';
import games from './routes/games.js';
import play from './routes/play.js'
import watch from './routes/watch.js'
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import gameNamespace from './namespaces/game.js';

const app = express();
app.set('trust proxy', true);
app.use('/public', express.static(path.join(process.cwd(), 'interface')));

const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 5000;

app.use((req, res, next) => {
    const date = new Date();
    console.log("[" + date.getDate() +  "/" + date.getMonth() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "] connexion : " + req.socket.remoteAddress + ", url : " + req.url);
    next();
});

const nsp = gameNamespace(io);

io.on('connection', socket => {
    socket.on('alive', status => {
        socket.emit('alive_conn', 1)
    });
});

app.use('/api', api());
app.use('/play', play());
app.use('/watch', watch());
app.use('/games', games());
app.use('/about-us', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/about-us/about-us.html'));});
app.use('/credits', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/credits/credits.html'));});
app.use('/rules', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/rules/rules.html'));});
app.get('/lifecompanion', (req, res) => res.sendFile(path.join(process.cwd(), '/interface/testlifecompanion/index.html')));
app.use(home());

server.listen(port, () => {
    console.log('[✱] Démarrage du serveur sur le port', port);
});