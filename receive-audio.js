import dgram from 'dgram';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const vosk = require('vosk');

const server = dgram.createSocket('udp4');

const PORT = 5001;
const HOST = '127.0.0.1';
const MODEL_PATH = "model-fr";
const SAMPLE_RATE = 16000;

if(!fs.existsSync(MODEL_PATH)) {
    console.error(`Erreur : Le dossier '${MODEL_PATH}' est introuvable.`);
    process.exit(1);
}

const alphabetHomophones = {
    "a": ["a", "à", "ah", "ha"],
    "b": ["b", "baie"],
    "c": ["c", "c'est", "ces", "ses", "s'est", "sais", "sait"],
    "d": ["d", "des", "dès"],
    "e": ["e", "eu", "eux"],
    "f": ["f"],
    "g": ["g", "j'ai", "jet"],
    "h": ["h", "hache"]
};

const chiffresHomophones = {
    "un": ["un", "hein"],
    "deux": ["deux", "de"],
    "trois": ["trois"],
    "quatre": ["quatre"],
    "cinq": ["cinq"],
    "six": ["six", "si", "scie"],
    "sept": ["sept", "cet", "cette", "set"],
    "huit": ["huit", "oui"]
};

const pieces = ["tour", "cavalier", "fou", "dame", "pion", "roi"];
const ordre = ["abandon", "réinitialiser", "non", "annuler"];
const ignore = ["échec", "mat", "petit roque", "grand roque", "échec et mat", "roque", "petit", "grand", "pat"];

const reverseMap = {};
Object.entries(alphabetHomophones).forEach(([letter, syns]) => syns.forEach(s => reverseMap[s] = letter));
Object.entries(chiffresHomophones).forEach(([digit, syns]) => syns.forEach(s => reverseMap[s] = digit));

const grammar = [...pieces, ...ordre, ...ignore];

Object.values(alphabetHomophones).forEach(letterSyns => {
    Object.values(chiffresHomophones).forEach(digitSyns => {
        letterSyns.forEach(ls => {
            digitSyns.forEach(ds => {
                grammar.push(`${ls} ${ds}`);
            });
        });
    });
});

Object.values(alphabetHomophones).forEach(syns => grammar.push(...syns));
Object.values(chiffresHomophones).forEach(syns => grammar.push(...syns));

console.log('[✱] Ecoute du flux audio sur le port')
console.log("[✱] Chargement du modèle Vosk");

vosk.setLogLevel(-1)
const model = new vosk.Model(MODEL_PATH);
export const rec = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE, grammar });
console.log("[✱] Modèle Vosk chargé");

export function startListening(callback) {
    server.on('error', err => {
        console.log(`[X] Erreur lors de l'écoute :\n${err.stack}`);
        server.close();
    });

    server.on('message', (msg, rinfo) => {
        const audioPayload = msg.slice(12);
        if (rec.acceptWaveform(audioPayload)) {
            callback(transform(rec.result().text), rinfo.address);
        }
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`[✱] Écoute du flux RTP sur ${address.address}:${address.port}`);
    });

    server.bind(PORT, HOST);
};

export function transform(text) {
    let cleanText = text.split(" ").map(w => reverseMap[w] || w).join(" ");
    return cleanText.replaceAll(" un", "1").replaceAll(" deux", "2").replaceAll(" trois", "3").replaceAll(" quatre", '4').replaceAll(" cinq", '5').replaceAll(" six", '6').replaceAll(" sept", "7").replaceAll(" huit", "8");
}