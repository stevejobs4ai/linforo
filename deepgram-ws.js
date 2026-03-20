/**
 * Deepgram WebSocket Proxy Server — port 3005
 * Bridges browser audio streams to Deepgram's live transcription API.
 * The HTTPS proxy (https-proxy.js) routes wss://host:3003/api/transcribe-ws here.
 */

const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local
function loadEnv() {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local may not exist in production
  }
}
loadEnv();

const PORT = 3005;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (clientWs) => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    clientWs.send(JSON.stringify({ error: 'DEEPGRAM_API_KEY not configured' }));
    clientWs.close();
    return;
  }

  const dgUrl =
    'wss://api.deepgram.com/v1/listen' +
    '?language=it' +
    '&model=nova-2' +
    '&encoding=webm-opus' +
    '&sample_rate=48000' +
    '&interim_results=true' +
    '&smart_format=true' +
    '&endpointing=500';

  let dgWs = null;
  let pendingChunks = [];
  let dgReady = false;

  try {
    dgWs = new WebSocket(dgUrl, {
      headers: { Authorization: `Token ${apiKey}` },
    });
  } catch (err) {
    console.error('[deepgram-ws] Failed to connect to Deepgram:', err.message);
    clientWs.send(JSON.stringify({ error: 'Deepgram connection failed' }));
    clientWs.close();
    return;
  }

  dgWs.on('open', () => {
    dgReady = true;
    // Flush any buffered chunks
    for (const chunk of pendingChunks) {
      if (dgWs.readyState === WebSocket.OPEN) dgWs.send(chunk);
    }
    pendingChunks = [];
  });

  dgWs.on('message', (data) => {
    try {
      const result = JSON.parse(data.toString());
      const transcript = result?.channel?.alternatives?.[0]?.transcript ?? '';
      const isFinal = result?.is_final ?? false;
      const speechFinal = result?.speech_final ?? false;

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ transcript, isFinal, speechFinal }));
      }
    } catch {
      // Ignore unparseable messages
    }
  });

  dgWs.on('error', (err) => {
    console.error('[deepgram-ws] Deepgram WS error:', err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: 'Deepgram error' }));
      clientWs.close();
    }
  });

  dgWs.on('close', () => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
  });

  // Receive audio chunks from browser, forward to Deepgram
  clientWs.on('message', (data) => {
    if (typeof data === 'string') {
      // Control messages from client
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'stop' && dgWs.readyState === WebSocket.OPEN) {
          // Send CloseStream message to Deepgram for clean finalisation
          dgWs.send(JSON.stringify({ type: 'CloseStream' }));
        }
      } catch {}
      return;
    }
    // Binary audio data
    if (!dgReady) {
      pendingChunks.push(data);
    } else if (dgWs.readyState === WebSocket.OPEN) {
      dgWs.send(data);
    }
  });

  clientWs.on('close', () => {
    if (dgWs && dgWs.readyState === WebSocket.OPEN) dgWs.close();
  });

  clientWs.on('error', (err) => {
    console.error('[deepgram-ws] Client WS error:', err.message);
    if (dgWs && dgWs.readyState === WebSocket.OPEN) dgWs.close();
  });
});

console.log(`[deepgram-ws] Listening on ws://0.0.0.0:${PORT}`);
