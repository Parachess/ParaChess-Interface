import api from './routes/api.js';
import path from 'path';
import home from './routes/home.js';
import games from './routes/games.js';
import parachess from './routes/parachess.js'
import disconnect4 from './routes/disconnect4.js'
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { VoicePool } from './worker-pool.js';
import parachessNamespace from './namespaces/parachess.js';
import disconnect4Namespace from './namespaces/disconnect4.js';

const app = express();
app.set('trust proxy', true);
app.use('/public', express.static(path.join(process.cwd(), 'interface')));

const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 5000;

const parachessNSP = parachessNamespace(io);
const disconnect4NSP = disconnect4Namespace(io);

app.use((req, res, next) => {
    const date = new Date();
    console.log("[" + date.getDate() +  "/" + date.getMonth() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "] connexion : " + req.socket.remoteAddress + ", url : " + req.url);
    next();
});


const voicePool = new VoicePool(); // demarre le(s) worker(s) au lancement du serveur
 
io.on('connection', socket => {
    socket.on('alive', _ => {
        socket.emit('alive_conn', 1)
    });
 
    socket.on('audio', buffer => {
        // Ne bloque plus le thread principal : part dans le worker pool
        voicePool.sendAudio(socket.id, buffer, 'chess');
    });
 
    socket.on('disconnect', () => {
        voicePool.removeConnection(socket.id);
    });
});
 
// Le worker pool emet un evenement des qu'une commande vocale est detectee.
// Il faut retrouver le bon socket par son id pour lui repondre.
voicePool.on('voice-command', (socketId, command) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) socket.emit('voice-command', command);
});

app.use('/api', api());
app.use('/parachess', parachess());
app.use('/disconnect4', disconnect4());
app.use('/jeux', games());
app.use('/a-propos', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/about-us/about-us.html'));});
app.use('/mentions-legales', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/legal-notice/legal-notice.html'));});
app.use('/credits', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/credits/credits.html'));});
app.use('/regles', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/rules/rules.html'));});
app.use('/aide', (req, res) => {res.sendFile(path.join(process.cwd(), '/interface/help/help.html'));});
app.get('/lifecompanion', (req, res) => res.sendFile(path.join(process.cwd(), '/interface/testlifecompanion/index.html')));
app.use(home());

server.listen(port, () => {
    console.log('[✱] Démarrage du serveur sur le port', port);
});