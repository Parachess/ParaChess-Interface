/*******************************************************************************/
/** Détermine sur quelle page on est pour savoir quel bloc utiliser plus bas. **/
/*******************************************************************************/
const VOICE_PAGE = (function detectPage() {
    const path = window.location.pathname;
    if (path.startsWith('/parachess/jouer')) return 'parachess-play';
    if (path.startsWith('/parachess/regarder')) return 'parachess-watch';
    if (path.startsWith('/disconnect4/jouer')) return 'disconnect4-play';
    if (path.startsWith('/disconnect4/regarder')) return 'disconnect4-watch';
    if (path.startsWith('/jeux')) return 'games';
    return 'static';
})();

/******************************************************/
/** GÉNÉRAL : Commandes communes à toutes les pages  **/
/******************************************************/
function goBackForward(command) {
    if (command === 'retour') { window.history.back(); return true; }
    if (command === 'revenir') { window.history.forward(); return true; }
    return false;
}

/****************************************************************************/
/** PAGES : index, credits, a-propos, mentions-legales, aide, regles       **/
/****************************************************************************/
(function staticPagesBlock() {
    if (VOICE_PAGE !== 'static') return;
 
    const page = document.body.dataset.voicePage;
 
    function dest() {
        return {
            credits: page === 'credits' ? null : '/credits',
            about: page === 'a-propos' ? null : '/a-propos',
            legal: page === 'mentions-legales' ? null : '/mentions-legales',
            aide: page === 'help' ? null : '/aide',
            parachess: '/jeux/?g=parachess',
            disconnect4: '/jeux/?g=disconnect4'
        };
    }
 
    function go(url) { if (url) window.open(url, '_self'); }
 
    function setFacialDetection(active) {
        if (active && typeof window.activateFacialDetection === 'function') {
            window.activateFacialDetection();
        } else if (!active && typeof window.deactivateFacialDetection === 'function') {
            window.deactivateFacialDetection();
        }
    }
 
    let vocalMode = true;
    let vocalStream = null;
 
    window.socket = window.socket || io();
    window.socket.on('voice-command', command => {
        if (command === 'micro-on') { if (!vocalMode) toggleVocalMode(); return; }
        if (!vocalMode) return;
        if (goBackForward(command)) return;
        const d = dest();
        switch (command) {
            case 'quitter':
            case 'accueil': go(page === 'index' ? null : '/'); break;
            case 'credits': go(d.credits); break;
            case 'a-propos': go(d.about); break;
            case 'mentions-legales': go(d.legal); break;
            case 'aide': go(d.aide); break;
            case 'camera-on': setFacialDetection(true); break;
            case 'camera-off': setFacialDetection(false); break;
            case 'micro-off':
                if (vocalMode) toggleVocalMode();
                break;
            case 'parachess': go(d.parachess); break;
            case 'disconnect4': go(d.disconnect4); break;
        }
    });
 
    function toggleVocalMode() {
        const image = document.getElementById('toggle-vocal-button-image');
        const button = document.getElementById('toggle-vocal-button');
        if (vocalMode) {
            vocalMode = false;
            if (button) button.classList.remove('vocal-active');
            document.body.classList.remove('vocal-active');
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
            document.body.classList.add('vocal-active');
            if (!vocalStream) startVoiceMenu();
        }
    }
    window.toggleVocalMode = window.toggleVocalMode || toggleVocalMode;
 
    async function startVoiceMenu() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            vocalStream = stream;
            document.body.classList.add('vocal-active');
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processor.onaudioprocess = e => {
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
            document.body.classList.remove('vocal-active');
        }
    }
 
    startVoiceMenu();
})();

/*******************/
/** PAGES : games **/
/*******************/
(function gamesBlock() {
    if (VOICE_PAGE !== 'games') return;
 
    const game = new URLSearchParams(location.search).get('g');
 
    function dest() {
        return {
            regles: game ? `/regles/?g=${game}` : null,
            parachess: game === 'parachess' ? null : '/jeux/?g=parachess',
            disconnect4: game === 'disconnect4' ? null : '/jeux/?g=disconnect4'
        };
    }
 
    function go(url) { if (url) window.open(url, '_self'); }
 
    function setFacialDetection(active) {
        if (active && typeof window.activateFacialDetection === 'function') {
            window.activateFacialDetection();
        } else if (!active && typeof window.deactivateFacialDetection === 'function') {
            window.deactivateFacialDetection();
        }
    }
 
    let vocalMode = true;
    let vocalStream = null;
 
    window.socket = window.socket || io();
    window.socket.on('voice-command', command => {
        if (command === 'micro-on') { if (!vocalMode) toggleVocalMode(); return; }
        if (!vocalMode) return;
        if (goBackForward(command)) return;
        const d = dest();
        switch (command) {
            case 'quitter':
            case 'accueil': go('/'); break;
            case 'credits': go('/credits'); break;
            case 'a-propos': go('/a-propos'); break;
            case 'mentions-legales': go('/mentions-legales'); break;
            case 'aide': go('/aide'); break;
            case 'regles': go(d.regles); break;
            case 'parachess': go(d.parachess); break;
            case 'disconnect4': go(d.disconnect4); break;
            case 'camera-on': setFacialDetection(true); break;
            case 'camera-off': setFacialDetection(false); break;
            case 'creer-partie':
                if (typeof window.createGameAutomatically === 'function') window.createGameAutomatically();
                break;
            case 'micro-off':
                if (vocalMode) toggleVocalMode();
                break;
            case 'un-ordinateur': {
                const cb = document.getElementById('play-with-someone');
                if (cb && cb.checked && typeof window.switchComputer === 'function') {
                    cb.checked = false;
                    window.switchComputer();
                }
                break;
            }
            case 'deux-ordinateurs': {
                const cb = document.getElementById('play-with-someone');
                if (cb && !cb.checked && typeof window.switchComputer === 'function') {
                    cb.checked = true;
                    window.switchComputer();
                }
                break;
            }
        }
    });
 
    function toggleVocalMode() {
        const image = document.getElementById('toggle-vocal-button-image');
        const button = document.getElementById('toggle-vocal-button');
        if (vocalMode) {
            vocalMode = false;
            if (button) button.classList.remove('vocal-active');
            document.body.classList.remove('vocal-active');
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
            document.body.classList.add('vocal-active');
            if (!vocalStream) startVoiceMenu();
        }
    }
    window.toggleVocalMode = window.toggleVocalMode || toggleVocalMode;
 
    async function startVoiceMenu() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            vocalStream = stream;
            document.body.classList.add('vocal-active');
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processor.onaudioprocess = e => {
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
            document.body.classList.remove('vocal-active');
        }
    }
 
    startVoiceMenu();
})();

/******************************/
/** PAGES : /parachess/jouer **/
/******************************/
(function parachessPlayBlock() {
    if (VOICE_PAGE !== 'parachess-play') return;

    function setCoordinates(show) {
        const checkbox = document.getElementById('showCoordinates');
        if (!checkbox) return;
        if (checkbox.checked !== show) {
            checkbox.checked = show;
            checkbox.dispatchEvent(new Event('change'));
        }
    }

    let vocalMode = true;
    let recStarted = false;

    function handleVoiceCommand(command) {
        if (command === 'micro-on') { if (!vocalMode) toggleVocalMode(); return; }
        if (!vocalMode) return;
        if (goBackForward(command)) return;
        switch (command) {
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
            case 'camera-on':
                if (typeof window.activateFacialDetection === 'function') window.activateFacialDetection();
                break;
            case 'camera-off':
                if (typeof window.deactivateFacialDetection === 'function') window.deactivateFacialDetection();
                break;
            case 'micro-off':
                if (vocalMode) toggleVocalMode();
                break;
        }
    }
    window.handleVoiceCommand = handleVoiceCommand;

    document.addEventListener("DOMContentLoaded", () => {
        startRec();
    });

    /**
     * Activate / Desactivate microphone
     */
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
            if (!recStarted) startRec();
        }
    }
    window.toggleVocalMode = toggleVocalMode;

    async function startRec() {
        vocalMode = true;
        recStarted = true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            document.body.classList.add("vocal-active");
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processor.onaudioprocess = (e) => {
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
})();


/******************************************/
/** Page concernée : /parachess/regarder **/
/******************************************/
(function parachessWatchBlock() {
    if (VOICE_PAGE !== 'parachess-watch') return;

    function setCoordinates(show) {
        const checkbox = document.getElementById('showCoordinates');
        if (!checkbox) return;
        if (checkbox.checked !== show) {
            checkbox.checked = show;
            checkbox.dispatchEvent(new Event('change'));
        }
    }

    let vocalMode = true;

    function handleVoiceCommand(command) {
        // Le micro "off" ignore tout sauf "micro-on" (le flux audio reste actif en arrière-plan)
        if (command === 'micro-on') { if (!vocalMode) toggleVocalMode(); return; }
        if (!vocalMode) return;
        if (goBackForward(command)) return;
        switch (command) {
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
            case 'camera-on':
                if (typeof window.activateFacialDetection === 'function') window.activateFacialDetection();
                break;
            case 'camera-off':
                if (typeof window.deactivateFacialDetection === 'function') window.deactivateFacialDetection();
                break;
            case 'micro-off':
                if (vocalMode) toggleVocalMode();
                break;
        }
    }

    window.menuSocket = io();
    window.menuSocket.on('voice-command', handleVoiceCommand);

    document.addEventListener("DOMContentLoaded", (e) => {
        startRec();
    });

    function toggleVocalMode() {
        const image = document.getElementById('toggle-vocal-button-image');
        if (vocalMode) {
            vocalMode = false;
            document.getElementById("toggle-vocal-button").classList.remove("vocal-active");
            image.src = "/public/assets/mic-off.svg";
            image.alt = "🔇";
        } else {
            vocalMode = true;
            image.src = "/public/assets/mic-on.svg";
            document.getElementById("toggle-vocal-button").classList.add("vocal-active");
            image.alt = "🎙️";
        }
    }
    window.toggleVocalMode = toggleVocalMode;

    async function startRec() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processor.onaudioprocess = e => {
                const input = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                window.menuSocket.emit('audio', pcm16.buffer);
            };
        } catch (e) {
            console.warn("Micro indisponible pour la commande vocale du menu.");
            document.getElementById("toggle-vocal-button")?.classList.add("hidden");
        }
    }
})();


/*******************************/
/** PAGE : /disconnect4/jouer **/
/*******************************/
(function disconnect4PlayBlock() {
    if (VOICE_PAGE !== 'disconnect4-play') return;

    let vocalMode = true;
    let recStarted = false;

    function handleVoiceCommand(command) {
        // Le micro "off" ignore tout sauf "micro-on" (le flux audio reste actif en arrière-plan)
        if (command === 'micro-on') { if (!vocalMode) toggleVocalMode(); return; }
        if (!vocalMode) return;
        if (goBackForward(command)) return;
        switch (command) {
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
                window.open('/regles/?g=disconnect4', '_self');
                break;
            case 'a-propos':
                window.open('/a-propos', '_self');
                break;
            case 'mentions-legales':
                window.open('/mentions-legales', '_self');
                break;
            case 'camera-on':
                if (typeof window.activateFacialDetection === 'function') window.activateFacialDetection();
                break;
            case 'camera-off':
                if (typeof window.deactivateFacialDetection === 'function') window.deactivateFacialDetection();
                break;
            case 'micro-off':
                if (vocalMode) toggleVocalMode();
                break;
            case 'disconnect4':
                break;
            case 'parachess':
                window.open('/jeux/?g=parachess', '_self');
                break;
        }
    }
    window.handleVoiceCommand = handleVoiceCommand;

    startRec();

    /**
     * Activate / Desactivate microphone
     */
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
            if (!recStarted) startRec();
        }
    }
    window.toggleVocalMode = toggleVocalMode;

    async function startRec() {
        vocalMode = true;
        recStarted = true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            document.body.classList.add("vocal-active");
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processor.onaudioprocess = (e) => {
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
})();


/***********************************/
/** PAGES : /disconnect4/regarder **/
/***********************************/
(function disconnect4WatchBlock() {
    if (VOICE_PAGE !== 'disconnect4-watch') return;

    let vocalMode = true;

    function handleVoiceCommand(command) {
        // Le micro "off" ignore tout sauf "micro-on" (le flux audio reste actif en arrière-plan)
        if (command === 'micro-on') { if (!vocalMode) toggleVocalMode(); return; }
        if (!vocalMode) return;
        if (goBackForward(command)) return;
        switch (command) {
            case 'quitter':
            case 'accueil':
                window.open(window.location.origin, '_self');
                break;
            case 'credits':
                window.open('/credits', '_self');
                break;
            case 'aide':
                window.open('aide', '_self');
                break;
            case 'regles':
                window.open('/regles/?g=disconnect4', '_self');
                break;
            case 'a-propos':
                window.open('/a-propos', '_self');
                break;
            case 'mentions-legales':
                window.open('/mentions-legales', '_self');
                break;
            case 'camera-on':
                if (typeof window.activateFacialDetection === 'function') window.activateFacialDetection();
                break;
            case 'camera-off':
                if (typeof window.deactivateFacialDetection === 'function') window.deactivateFacialDetection();
                break;
            case 'micro-off':
                if (vocalMode) toggleVocalMode();
                break;
            case 'disconnect4':
                break;
            case 'parachess':
                window.open('/jeux/?g=parachess', '_self');
                break;
        }
    }

    window.menuSocket = io();
    window.menuSocket.on('voice-command', handleVoiceCommand);

    function toggleVocalMode() {
        const image = document.getElementById('toggle-vocal-button-image');
        if (vocalMode) {
            vocalMode = false;
            document.getElementById("toggle-vocal-button").classList.remove("vocal-active");
            image.src = "/public/assets/mic-off.svg";
            image.alt = "🔇";
        } else {
            vocalMode = true;
            image.src = "/public/assets/mic-on.svg";
            document.getElementById("toggle-vocal-button").classList.add("vocal-active");
            image.alt = "🎙️";
        }
    }
    window.toggleVocalMode = toggleVocalMode;

    (async function startRec() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            processor.onaudioprocess = e => {
                const input = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                window.menuSocket.emit('audio', pcm16.buffer);
            };
        } catch (e) {
            console.warn("Micro indisponible pour la commande vocale du menu.");
            document.getElementById("toggle-vocal-button")?.classList.add("hidden");
        }
    })();
})();