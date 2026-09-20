import { parentPort } from 'worker_threads';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const vosk = require('@echogarden/vosk');

const MODEL_PATH = 'model-fr';
const SAMPLE_RATE = 16000;

vosk.setLogLevel(-1);
const model = new vosk.Model(MODEL_PATH);

import { grammarChess, grammarPuissance4, transform, detectMenuCommand } from './voice-recognition.js';

const recognizers = new Map();

function getRecognizer(socketId, mode) {
  if (!recognizers.has(socketId)) {
    recognizers.set(socketId, {});
  }
  const entry = recognizers.get(socketId);
  if (!entry[mode]) {
    const grammar = mode === 'puissance4' ? grammarPuissance4 : grammarChess;
    entry[mode] = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE, grammar });
  }
  return entry[mode];
}

const pendingBuffers = new Map();
const MERGE_WINDOW_MS = 800;

function flushPending(socketId) {
  const entry = pendingBuffers.get(socketId);
  if (!entry) return;
  clearTimeout(entry.timer);
  const fullText = entry.words.join(" ");
  const menuCommand = detectMenuCommand(fullText.toLowerCase());
  if (menuCommand) {
    parentPort.postMessage({ type: 'voice-command', socketId, command: menuCommand });
  }
  pendingBuffers.delete(socketId);
}

parentPort.on('message', (msg) => {
  if (msg.type === 'audio') {
    const { socketId, mode, buffer } = msg;
    const rec = getRecognizer(socketId, mode || 'chess');
    const uint8 = new Uint8Array(buffer);
    if (rec.acceptWaveform(uint8)) {
      const result = rec.result();
      if (result?.text) {
        const cleaned = transform(result.text);
        if (cleaned) {
          if (!pendingBuffers.has(socketId)) {
            pendingBuffers.set(socketId, { words: [], timer: null });
          }
          const entry = pendingBuffers.get(socketId);
          entry.words.push(cleaned);
          clearTimeout(entry.timer);
          entry.timer = setTimeout(() => flushPending(socketId), MERGE_WINDOW_MS);
        }
      }
    }
    return;
  }

  if (msg.type === 'disconnect') {
    // libere la memoire du/des reconnaisseurs de ce socket
    recognizers.delete(msg.socketId);
    const entry = pendingBuffers.get(msg.socketId);
    if (entry) clearTimeout(entry.timer);
    pendingBuffers.delete(msg.socketId);
  }
});

// Signale au thread principal que le modele est charge et pret
parentPort.postMessage({ type: 'ready' });
