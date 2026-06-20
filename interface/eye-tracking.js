import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8";

const video = document.getElementById("webcam");
const gazeDot = document.getElementById("eye-tracker");
const predictionInterval = 33; // 33 fps

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
        if (detectMobile())
            throw new Error("Mobile phone incompatible with face tracking.");

        if (!setupDone) {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                outputFacialTransformationMatrixes: true,
                runningMode: "VIDEO"
            });
            setupWebcam();
        }
    } catch (err) {
        document.getElementById("toggle-facial-button").classList.remove("facial-active");
        document.getElementById("toggle-facial-button").classList.add("hidden");
        updateToggleSwitch(false);
    }
}

function setupWebcam() {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
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
    try {
        while (predictionRunning && cameraGuess) {
            const cameraPermission = await navigator.permissions.query({ name: "camera" });
            if (cameraPermission.state !== "granted") {
                cameraGuess = false;
                document.getElementById("toggle-facial-button").classList.remove("facial-active");
                document.getElementById("toggle-facial-button").classList.add("hidden");
                gazeDot.classList.remove("active");
                updateToggleSwitch(false);
                return;
            }
            gazeDot.classList.add("active");
            await predictWebcam();
            await new Promise(resolve => setTimeout(resolve, 1));
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

async function predictWebcam() {
    if (!predictionRunning || !cameraGuess || isProcessing) return;

    isProcessing = true;

    try {
        gazeDot.classList.add("active");
        let nowInMs = performance.now();

        if (nowInMs - lastVideoTime >= predictionInterval) {
            lastVideoTime = video.currentTime;
            const results = faceLandmarker.detectForVideo(video, nowInMs);

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                const pUpper = landmarks[159];
                const pLower = landmarks[145];
                const pLeft = landmarks[33];
                const pRight = landmarks[133];

                const verticalDist = Math.hypot(pUpper.x - pLower.x, pUpper.y - pLower.y);
                const horizontalDist = Math.hypot(pLeft.x - pRight.x, pLeft.y - pRight.y);
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

            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
                const matrix = results.facialTransformationMatrixes[0].data;
                let rotationX = matrix[2];
                let rotationY = matrix[6];

                let targetX = window.innerWidth / 2 + (rotationX * window.innerWidth * 2.0);
                let targetY = window.innerHeight / 2 + (rotationY * window.innerHeight * 2.0);

                positionHistoryX.push(targetX);
                positionHistoryY.push(targetY);

                if (positionHistoryX.length - 1 > smoothingFactor) positionHistoryX.shift(); // If smoothing factor is set to 0
                if (positionHistoryY.length - 1 > smoothingFactor) positionHistoryY.shift(); // we keep only a single prediction

                let avgX = positionHistoryX.reduce((a, b) => a + b, 0) / positionHistoryX.length;
                let avgY = positionHistoryY.reduce((a, b) => a + b, 0) / positionHistoryY.length;

                gazeDot.style.left = `${Math.max(0, Math.min(avgX, window.innerWidth))}px`;
                gazeDot.style.top = `${Math.max(0, Math.min(avgY, window.innerHeight))}px`;
            }
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

function detectMobile() {
    const toMatch = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i
    ];

    return toMatch.some((toMatchItem) => {
        return navigator.userAgent.match(toMatchItem);
    });
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