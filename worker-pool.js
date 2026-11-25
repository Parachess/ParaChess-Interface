import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import os from 'os';

const POOL_SIZE = parseInt(process.env.VOSK_WORKERS || Math.max(1, /*os.cpus().length - 1*/ 3), 10);

const workerUrl = new URL('./voice-worker.js', import.meta.url);

export class VoicePool extends EventEmitter {
  constructor(size = POOL_SIZE) {
    super();
    this.workers = [];
    this.socketWorkerMap = new Map();
    this.nextIndex = 0;

    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerUrl);
      worker.on('message', (msg) => {
        if (msg.type === 'voice-command') {
          this.emit('voice-command', msg.socketId, msg.command);
        }
        if (msg.type === 'ready') {
          console.log(`[✱] Worker vosk ${i} pret`);
        }
      });
      worker.on('error', (err) => {
        console.error(`[X] Worker vosk ${i} a plante :`, err);
      });
      this.workers.push(worker);
    }

    console.log(`[✱] Pool vosk demarre avec ${size} worker(s)`);
  }

  _getWorkerFor(socketId) {
    if (!this.socketWorkerMap.has(socketId)) {
      const worker = this.workers[this.nextIndex % this.workers.length];
      this.nextIndex++;
      this.socketWorkerMap.set(socketId, worker);
    }
    return this.socketWorkerMap.get(socketId);
  }

  sendAudio(socketId, buffer, mode = 'chess') {
    const worker = this._getWorkerFor(socketId);
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const isolated = new Uint8Array(uint8.length);
    isolated.set(uint8);
    worker.postMessage(
      { type: 'audio', socketId, mode, buffer: isolated.buffer },
      [isolated.buffer]
    );
  }

  removeConnection(socketId) {
    const worker = this.socketWorkerMap.get(socketId);
    if (worker) {
      worker.postMessage({ type: 'disconnect', socketId });
      this.socketWorkerMap.delete(socketId);
    }
  }

  async close() {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}