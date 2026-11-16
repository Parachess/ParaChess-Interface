import dgram from 'dgram';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const vosk = require('@echogarden/vosk');

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
    "1": ["un", "hein", "une", "d'un"],
    "2": ["deux", "de", "deu", "d'eux"],
    "3": ["trois"],
    "4": ["quatre"],
    "5": ["cinq"],
    "6": ["six", "si", "scie"],
    "7": ["sept", "cet", "cette", "set"],
    "8": ["huit", "oui"]
};

const puissance4Homophones = {
    "colonne" : ["colonnes", "colonne", 'cologne']
};

const screenHomophones = {
    "écran": ["écran", "écrans", "ecran", "ecrans"]
};

const vocMenu = ["[unk]", "menu", "retour", "quitter", "revenir", "accueil",
    "crédits", "propos", "sommes", "nous", "règle", "règles", "aide", "mentions", "légales",
    "échecs", "puissance", "coordonnées", "caméra", "micro",
    "activer", "désactiver", "créer", "automatiquement", "partie",
    "jouer", "écran", "écrans", "ecran", "ecrans"];
const vocPuissance4 = ["colonne"];
const pieces = ["tour", "cavalier", "fou", "dame", "pion", "roi"];
const ordre = ["abandonner", "recommencer", "rejouer", "non", "annuler"];
const ignore = ["échec", "mat", "petit roque", "grand roque", "échec et mat", "roque", "petit", "grand", "pat"];

const reverseMap = {};
Object.entries(alphabetHomophones).forEach(([letter, syns]) => syns.forEach(s => reverseMap[s] = letter));
Object.entries(chiffresHomophones).forEach(([digit, syns]) => syns.forEach(s => reverseMap[s] = digit));
Object.entries(puissance4Homophones).forEach(([word, syns]) => syns.forEach(s => reverseMap[s] = word));
Object.entries(screenHomophones).forEach(([word, syns]) => syns.forEach(s => reverseMap[s] = word));

const grammarChess = [...pieces, ...ordre, ...ignore, ...vocMenu];

Object.values(alphabetHomophones).forEach(letterSyns => {
    Object.values(chiffresHomophones).forEach(digitSyns => {
        letterSyns.forEach(ls => {
            digitSyns.forEach(ds => {
                grammarChess.push(`${ls} ${ds}`);
            });
        });
    });
});

Object.values(alphabetHomophones).forEach(syns => grammarChess.push(...syns));
Object.values(chiffresHomophones).forEach(syns => grammarChess.push(...syns));

const screenPhrases = [
    "un écran", "un ecran", "une écran", "une ecran",
    "deux écrans", "deux ecran", "deux ecrans", "deu ecran", "deu ecrans", "de écrans", "de ecran",
    "jouer à un écran", "jouer à un ecran", "jouer à une écran",
    "jouer à deux écrans", "jouer à deux ecran", "jouer à deux ecrans", "jouer à deu ecran", "jouer à deu ecrans", "jouer à de écrans",
    "jouer un écran", "jouer deux écrans", "jouer un ecran", "jouer deux ecran",
    "jouer à un", "jouer à deux", "jouer à deu", "jouer à une"
];

grammarChess.push("puissance quatre", ...screenPhrases);

const grammarPuissance4 = [...ordre, ...vocMenu, ...vocPuissance4];
const chiffresPuissance4 = ["1", "2", "3", "4", "5", "6", "7"];

puissance4Homophones["colonne"].forEach(colSyn => {
    chiffresPuissance4.forEach(chiffreKey => {
        chiffresHomophones[chiffreKey].forEach(digitSyn => {
            grammarPuissance4.push(`${colSyn} ${digitSyn}`);
        });
    });
});

Object.values(chiffresHomophones).forEach(syns => grammarPuissance4.push(...syns));
Object.values(puissance4Homophones).forEach(syns => grammarPuissance4.push(...syns));

grammarPuissance4.push("puissance quatre", ...screenPhrases);

export { grammarChess, grammarPuissance4 };

console.log("[✱] Chargement du modèle Vosk");

vosk.setLogLevel(-1)
const model = new vosk.Model(MODEL_PATH);
export const recChess = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE, grammar: grammarChess });
export const recPuissance4 = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE, grammar: grammarPuissance4 });

console.log("[✱] Modèle Vosk chargé");

export function startListening(callback) {
    server.on('error', err => {
        console.log(`[X] Erreur lors de l'écoute :\n${err.stack}`);
        server.close();
    });

    server.on('message', (msg, rinfo) => {
        const audioPayload = msg.slice(12);
        if (rec.acceptWaveform(audioPayload)) {
            const rawText = rec.result().text;
            const cleanedText = transform(rawText);
            callback(cleanedText, rinfo.address);
        }
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`[✱] Écoute du flux RTP sur ${address.address}:${address.port}`);
    });

    server.bind(PORT, HOST);
};

export function transform(text) {
    const validWords = new Set([
        ...Object.values(reverseMap),
        ...pieces,
        ...ordre,
        ...ignore,
        ...vocMenu
    ]);
    return text
        .split(" ")
        .map(w => reverseMap[w] || w)
        .filter(w => validWords.has(w))
        .join(" ");
}

export function detectMenuCommand(text) {
    const words = text.split(" ");
    if (words.includes("crédits")) return "credits";
    if (words.includes("mention") || words.includes("légal") || words.includes("mentions") || words.includes("légales")) return "mentions-legales";
    if (words.includes("propos") || words.includes("sommes") || words.includes("nous")) return "a-propos";
    if (words.includes("échecs") || words.includes("échec")) return "parachess";
    if (words.includes("puissance")) return "disconnect4";
    if (words.includes("caméra")) {
        if (words.includes("désactiver")) return "camera-off";
        if (words.includes("activer")) return "camera-on";
    }
    if (words.includes("micro")) {
        if (words.includes("désactiver")) return "micro-off";
        if (words.includes("activer")) return "micro-on";
    }
    if (words.includes("coordonnées")) {
        if (words.includes("désactiver")) return "coordonnees-off";
        if (words.includes("activer")) return "coordonnees-on";
    }

    const hasScreen = words.some(w => ["écran", "écrans", "ecran", "ecrans"].includes(w));
    const hasJouer = words.includes("jouer");
    const hasOne = words.some(w => ["1", "un", "une"].includes(w));
    const hasTwo = words.some(w => ["2", "deux", "de", "deu"].includes(w));

    if (hasScreen && hasJouer) {
        if (hasOne) return "un-ecran";
        if (hasTwo) return "deux-ecrans";
    }
    if (words.includes("créer") && (words.includes("automatiquement") || words.includes("partie"))) return "creer-partie";
    if (words.includes("aide")) return "aide";
    if (words.includes("règle") || words.includes("règles")) return "regles";
    if (words.includes("quitter")) return "quitter";
    if (words.includes("accueil")) return "accueil";
    if (words.includes("revenir")) return "revenir";
    if (words.includes("retour") || words.includes("menu")) return "retour";

    return null;
}
