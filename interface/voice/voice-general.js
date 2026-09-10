/*********************************/
/** Commandes vocales générales **/
/*********************************/

(function () {
    const page = document.body.dataset.voicePage;
    const game = new URLSearchParams(location.search).get('g');

    function dest() {
        return {
            credits: page === 'credits' ? null : '/credits',
            about: page === 'a-propos' ? null : '/a-propos',
            legal: page === 'mentions-legales' ? null : '/mentions-legales',
            aide: page === 'help' ? null : '/aide',
            regles: (page === 'regles') ? null :
                ((page === "jeux" && game) ? `/regles/?g=${game}` : '/regles'),
            parachess: (page === 'jeux' && game === 'parachess') ? null : '/jeux/?g=parachess',
            disconnect4: (page === 'jeux' && game === 'disconnect4') ? null : '/jeux/?g=disconnect4'
        };
    }

    function go(url) { if (url) window.open(url, '_self'); }

    /**
     * Activate / Desactivate facial recognition
     */
    function setFacialDetection(active) {
        if (active && typeof window.activateFacialDetection === 'function') {
            window.activateFacialDetection();
        } else if (!active && typeof window.deactivateFacialDetection === 'function') {
            window.deactivateFacialDetection();
        }
    }

    window.socket = window.socket || io();
    window.socket.on('voice-command', command => {
        const d = dest();
        switch (command) {
            case 'retour': window.history.back(); break;
            case 'revenir': window.history.forward(); break;
            case 'quitter':
            case 'accueil': go(page === 'index' ? null : '/'); break;
            case 'credits': go(d.credits); break;
            case 'a-propos': go(d.about); break;
            case 'mentions-legales': go(d.legal); break;
            case 'aide': go(d.aide); break;
            case 'regles': go(d.regles); break;
            case 'parachess': go(d.parachess); break;
            case 'disconnect4': go(d.disconnect4); break;
            case 'coordonnees-on': setCoordinates(true); break;
            case 'coordonnees-off': setCoordinates(false); break;
            case 'visage-on': setFacialDetection(true); break;
            case 'visage-off': setFacialDetection(false); break;
            case 'creer-partie':
                if (typeof window.createGameAutomatically === 'function') window.createGameAutomatically();
                break;
        }
    });

    let vocalMode = true;
    let vocalStream = null;

    /**
     * Activate / Desactivate microphone
     */
    function toggleVocalMode() {
        const image = document.getElementById('toggle-vocal-button-image');
        const button = document.getElementById('toggle-vocal-button');
        if (vocalMode) {
            vocalMode = false;
            if (vocalStream) vocalStream.getTracks().forEach(track => track.stop());
            if (button) button.classList.remove('vocal-active');
            if (image) {
                image.src = '/public/assets/mic-off.svg';
                image.alt = '🔇';
            }
        } else {
            vocalMode = true;
            if (image) {
                image.src = '/public/assets/mic-on.svg';
                image.alt = '🎙️';
            }
            if (button) button.classList.add('vocal-active');
            startVoiceMenu();
        }
    }
    window.toggleVocalMode = window.toggleVocalMode || toggleVocalMode;

    async function startVoiceMenu() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            vocalStream = stream;
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processor.onaudioprocess = e => {
                if (!vocalMode) {
                    processor.onaudioprocess = () => {};
                    return;
                }
                const input = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                window.socket.emit('audio', pcm16.buffer);
            };
        } catch (e) {
            console.warn("Micro indisponible pour la commande vocale du menu.");
            vocalMode = false;
            document.getElementById("toggle-vocal-button")?.classList.add("hidden");
        }
    }

    startVoiceMenu();
})();
