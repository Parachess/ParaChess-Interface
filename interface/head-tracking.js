import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8";

const video = document.getElementById("webcam");
const gazeDot = document.getElementById("head-tracker");
const predictionInterval = 150;

let faceLandmarker;
let lastVideoTime = -1;

let positionHistoryX = [];
let positionHistoryY = [];
let hasBlinked = false;
let predictionRunning = false;
let isProcessing = false;
let cameraGuess = true;

/**
 * Si x est le nombre d'image de moyennage (smoothingFactor) et y la sensibilité (%), nous utilisons
 * y = 100 - 2x en supposant qu'il n'y ait pas plus de 50 images pour moyenner.
 */
let smoothingFactor = localStorage.getItem("facialDetectionSmoothing") !== null ? parseFloat(localStorage.getItem("facialDetectionSmoothing")) : 8;
let blinkThreshold = localStorage.getItem("facialDetectionBlink") !== null ? parseFloat(localStorage.getItem("facialDetectionBlink")) : 0.25;
let setupDone = false;

const rangeSmoothingFactor = document.getElementById("sensibility-range");
const rangeBlinkDuration = document.getElementById("blink-range");
const popup = document.getElementById("face-detection-popup");

function updateToggleSwitch(checked) {
    const toggle = document.getElementById("face-detection-toggle");
    if (toggle) toggle.checked = checked;
}

function toggleFacialDetection(checkbox) {
    if (checkbox.checked) {
        activateFacialDetection();
    } else {
        deactivateFacialDetection();
    }
}

async function init() {
    try {
        if (!setupDone) {
            gazeDot.classList.add("loading");
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                outputFacialTransformationMatrixes: true,
                runningMode: "VIDEO",
                numFaces: 1
            });
            setupWebcam();
        }
    } catch (err) {
        gazeDot.classList.remove("loading");
        document.getElementById("toggle-facial-button").classList.remove("facial-active");
        document.getElementById("toggle-facial-button").classList.add("hidden");
        updateToggleSwitch(false);
    }
}

function setupWebcam() {
    navigator.mediaDevices.getUserMedia({ video: { width: 96, height: 72 } })
        .then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadeddata", () => {
                startPrediction();
            });
            setupDone = true;
        })
        .catch((err) => {
            document.getElementById("toggle-facial-button").classList.remove("facial-active");
            document.getElementById("toggle-facial-button").classList.add("hidden");
            updateToggleSwitch(false);
        });
}

function restartPrediction() {
    if (!setupDone)
        init();
    else
        startPrediction();
}

async function startPrediction() {
    if (!cameraGuess) return;
    if (predictionRunning) return;
    updateToggleSwitch(true);
    predictionRunning = true;

    const cameraPermission = await navigator.permissions.query({ name: "camera" });
    if (cameraPermission.state !== "granted") {
        cameraGuess = false;
        document.getElementById("toggle-facial-button").classList.remove("facial-active");
        document.getElementById("toggle-facial-button").classList.add("hidden");
        gazeDot.classList.remove("active");
        updateToggleSwitch(false);
        return;
    }
    cameraPermission.onchange = () => {
        if (cameraPermission.state !== "granted") {
            predictionRunning = false;
            cameraGuess = false;
            gazeDot.classList.remove("active");
            updateToggleSwitch(false);
        }
    };

    try {
        gazeDot.classList.add("active");
        while (predictionRunning && cameraGuess) {
            await predictWebcam();
            await new Promise(resolve => setTimeout(resolve, 33));
        }
    } catch (e) {
        gazeDot.classList.remove("active");
        predictionRunning = false;
        cameraGuess = false;
        updateToggleSwitch(false);
    }
}

function activateFacialDetection() {
    const image = document.getElementById('toggle-face-button-image');
    const button = document.getElementById("toggle-facial-button");
    if (Array.from(button.classList).includes("facial-active"))
        return;
    button.classList.add("facial-active");
    image.src = "/public/assets/eye-open.svg";
    image.alt = "🔴";
    cameraGuess = true;
    localStorage.setItem("facialDetectionEnabled", "true");
    updateToggleSwitch(true);
    restartPrediction();
}

function deactivateFacialDetection() {
    const image = document.getElementById('toggle-face-button-image');
    const button = document.getElementById("toggle-facial-button");
    if (Array.from(button.classList).includes("facial-active")) {
        button.classList.remove("facial-active");
        image.src = "/public/assets/eye-closed.svg";
        image.alt = "⚫";
        cameraGuess = false;
        localStorage.setItem("facialDetectionEnabled", "false");
        predictionRunning = false;
        updateToggleSwitch(false);
        gazeDot.classList.remove("active");
    }
    closeDetectionPopup();
}

let firstDetection = false;
let detectionCount = 0;
const warmupFrames = 2;

async function predictWebcam() {
    if (!faceLandmarker || !predictionRunning || !cameraGuess || isProcessing) return;

    const nowInMs = performance.now();
    if (nowInMs - lastVideoTime < predictionInterval) return;

    isProcessing = true;
    lastVideoTime = nowInMs;

    try {
        gazeDot.classList.add("active");
        const results = faceLandmarker.detectForVideo(video, nowInMs);

        if (results.faceLandmarks && results.faceLandmarks[0]) {
            const lm = results.faceLandmarks[0];
            
            const verticalDist = Math.hypot(lm[159].x - lm[145].x, lm[159].y - lm[145].y);
            const horizontalDist = Math.hypot(lm[33].x - lm[133].x, lm[33].y - lm[133].y);
            const ear = verticalDist / horizontalDist;

            if (ear < blinkThreshold) {
                if (!hasBlinked) {
                    triggerOcularClick();
                    hasBlinked = true;
                }
            } else {
                hasBlinked = false;
            }
        }

        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes[0]) {
            detectionCount++;
            if (detectionCount <= warmupFrames) return;

            if (!firstDetection) {
                gazeDot.classList.remove("loading");
                firstDetection = true;
            }

            const matrix = results.facialTransformationMatrixes[0].data;
            
            const targetX = window.innerWidth / 2 + (matrix[2] * window.innerWidth * 2.0);
            const targetY = window.innerHeight / 2 + (matrix[6] * window.innerHeight * 2.0);

            positionHistoryX.push(targetX);
            positionHistoryY.push(targetY);

            if (positionHistoryX.length > smoothingFactor + 1) positionHistoryX.shift();
            if (positionHistoryY.length > smoothingFactor + 1) positionHistoryY.shift();

            const avgX = positionHistoryX.reduce((a, b) => a + b, 0) / positionHistoryX.length;
            const avgY = positionHistoryY.reduce((a, b) => a + b, 0) / positionHistoryY.length;

            gazeDot.style.left = `${Math.max(0, Math.min(avgX, window.innerWidth))}px`;
            gazeDot.style.top = `${Math.max(0, Math.min(avgY, window.innerHeight))}px`;
        }
    } catch (e) {
        console.error(e);
    } finally {
        isProcessing = false;
    }
}

function triggerOcularClick() {
    const x = parseFloat(gazeDot.style.left);
    const y = parseFloat(gazeDot.style.top);

    if (!x || !y || !isFinite(x) || !isFinite(y))
        return;

    const targetElement = document.elementFromPoint(x, y);
    if (targetElement) {
        if (Array.from(targetElement.parentElement.classList).includes('square')) {
            drag = {
                piece: getSquare(targetElement.parentElement.dataset.pos),
                position: targetElement.parentElement.dataset.pos,
                square: targetElement.parentElement,
                hasMoved: false
            };
            drag.square.childNodes[0].textContent = "";
            drag.square.classList.add("is-dragging");
            applyLegalMoves(drag.position);
            drop(drag.position);
        } else if (Array.from(targetElement.classList).includes('square')) {
            drag = {
                piece: getSquare(targetElement.dataset.pos),
                position: targetElement.dataset.pos,
                square: targetElement,
                hasMoved: false
            };
            drag.square.childNodes[0].textContent = "";
            drag.square.classList.add("is-dragging");
            applyLegalMoves(drag.position);
            drop(drag.position);
        } else {
            targetElement.click();
        }
    }
}

function displayFacialDetectionPopup() {
    if (!Array.from(popup.classList).includes("visible")) {
        popup.classList.add("visible");
    } else {
        popup.classList.remove("visible");
    }
}

function closeDetectionPopup() {
    popup.classList.remove("visible");
}

function toDefaultParameters() {
    blinkThreshold = 0.25;
    rangeBlinkDuration.value = 0.25;
    document.getElementById("blink-value").innerText = 0.25;
    smoothingFactor = 8;
    rangeSmoothingFactor.value = rangeSmoothingFactor.max - 2 * smoothingFactor;
    document.getElementById("sensibility-value").innerText = rangeSmoothingFactor.max - 2 * smoothingFactor;
    while (positionHistoryX.length > smoothingFactor) {
        positionHistoryX.shift();
    }
    while (positionHistoryY.length > smoothingFactor) {
        positionHistoryY.shift();
    }
    rangeSmoothingFactor.style.setProperty('--range-pct', (rangeSmoothingFactor.value / rangeSmoothingFactor.max) * 100 + '%');
    rangeBlinkDuration.style.setProperty('--range-pct', (rangeBlinkDuration.value / rangeBlinkDuration.max) * 100 + '%');
    
    localStorage.removeItem("facialDetectionSmoothing");
    localStorage.removeItem("facialDetectionBlink");
    
    closeDetectionPopup();
}


window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("sensibility-value").innerText = rangeSmoothingFactor.max - 2 * smoothingFactor;
    rangeSmoothingFactor.value = rangeSmoothingFactor.max - 2 * smoothingFactor;
    rangeSmoothingFactor.onchange = e => {
        document.getElementById("sensibility-value").innerText = rangeSmoothingFactor.value;
        smoothingFactor = (rangeSmoothingFactor.max - rangeSmoothingFactor.value) / 2;
        localStorage.setItem("facialDetectionSmoothing", smoothingFactor);
        while (positionHistoryX.length > smoothingFactor) {
            positionHistoryX.shift();
        }
        while (positionHistoryY.length > smoothingFactor) {
            positionHistoryY.shift();
        }
        const pct = (rangeSmoothingFactor.value / rangeSmoothingFactor.max) * 100;
        rangeSmoothingFactor.style.setProperty('--range-pct', pct + '%');
    };
    document.getElementById("blink-value").innerText = blinkThreshold;
    rangeBlinkDuration.onchange = e => {
        document.getElementById("blink-value").innerText = rangeBlinkDuration.value;
        blinkThreshold = rangeBlinkDuration.value;
        localStorage.setItem("facialDetectionBlink", blinkThreshold);
        const pct = (rangeBlinkDuration.value / rangeBlinkDuration.max) * 100;
        rangeBlinkDuration.style.setProperty('--range-pct', pct + '%');
    };
    rangeSmoothingFactor.style.setProperty('--range-pct', (rangeSmoothingFactor.value / rangeSmoothingFactor.max) * 100 + '%');
    rangeBlinkDuration.style.setProperty('--range-pct', (rangeBlinkDuration.value / rangeBlinkDuration.max) * 100 + '%');
    window.activateFacialDetection = activateFacialDetection;
    window.deactivateFacialDetection = deactivateFacialDetection;
    window.displayFacialDetectionPopup = displayFacialDetectionPopup;
    window.closeDetectionPopup = closeDetectionPopup;
    window.toDefaultParameters = toDefaultParameters;
    window.toggleFacialDetection = toggleFacialDetection;
    
    const savedCameraGuess = localStorage.getItem("facialDetectionEnabled");
    if (savedCameraGuess === "false") {
        const button = document.getElementById("toggle-facial-button");
        const image = document.getElementById('toggle-face-button-image');
        if (button && image) {
            button.classList.remove("facial-active");
            image.src = "/public/assets/eye-closed.svg";
            image.alt = "⚫";
        }
        cameraGuess = false;
    } else {
        init();
    }
});