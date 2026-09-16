/*******************************************************/
/** Commandes vocales de la page "Jouer" de ParaChess **/
/*******************************************************/

function handleVoiceCommand(command) {
    switch (command) {
        case 'retour': window.history.back(); break;
        case 'revenir': window.history.forward(); break;
        case 'quitter':
        case 'accueil':
            window.open(window.location.origin, '_self');
            break;
        case 'credits':
            window.open('/credits', '_self');
            break;
        case 'aide':
            window.open('/aide', '_self');
            break;
        case 'regles':
            window.open('/regles/?g=parachess', '_self');
            break;
        case 'a-propos':
            window.open('/a-propos', '_self');
            break;
        case 'mentions-legales':
            window.open('/mentions-legales', '_self');
            break;
        case 'parachess':
            break;
        case 'disconnect4':
            window.open('/jeux/?g=disconnect4', '_self');
            break;
        case 'coordonnees-on':
            setCoordinates(true);
            break;
        case 'coordonnees-off':
            setCoordinates(false);
            break;
        case 'visage-on':
            if (typeof window.activateFacialDetection === 'function') window.activateFacialDetection();
            break;
        case 'visage-off':
            if (typeof window.deactivateFacialDetection === 'function') window.deactivateFacialDetection();
            break;
    }
}

/**
 * Show / Hide coordinates
 */
function setCoordinates(show) {
    const checkbox = document.getElementById('showCoordinates');
    if (!checkbox) return;
    if (checkbox.checked !== show) {
        checkbox.checked = show;
        checkbox.dispatchEvent(new Event('change'));
    }
}

let vocalMode = true;
document.addEventListener("DOMContentLoaded", (e) => {
    startRec();
});


function toggleVocalMode() {
    const image = document.getElementById('toggle-vocal-button-image');
    if (vocalMode) {
        vocalMode = false;
        document.getElementById("toggle-vocal-button").classList.remove("vocal-active");
        document.body.classList.remove("vocal-active");
        image.src = "/public/assets/mic-off.svg";
        image.alt = "🔇";
    } else {
        vocalMode = true;
        image.src = "/public/assets/mic-on.svg";
        document.getElementById("toggle-vocal-button").classList.add("vocal-active");
        document.body.classList.add("vocal-active");
        image.alt = "🎙️";
        startRec();
    }
}

async function startRec() {
    vocalMode = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        document.body.classList.add("vocal-active");
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioCtx.destination);
        processor.onaudioprocess = (e) => {
            if (!vocalMode) {
                processor.onaudioprocess = (e) => {};
                return;
            }
            const input = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            socket?.emit("audio", pcm16.buffer);
        };
    } catch (e) {
        vocalMode = false;
        document.getElementById("toggle-vocal-button").classList.add("hidden");
        document.body.classList.remove("vocal-active");
    }
}
