const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');

const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:3002',
  ws: true
});

// Deepgram WebSocket proxy — routes /api/transcribe-ws WS upgrades to deepgram-ws.js
const dgProxy = httpProxy.createProxyServer({
  target: 'http://localhost:3005',
  ws: true
});

const server = https.createServer({
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem')
}, (req, res) => {
  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/api/transcribe-ws') {
    dgProxy.ws(req, socket, head);
  } else {
    proxy.ws(req, socket, head);
  }
});

server.listen(3003, '0.0.0.0', () => {
  console.log('HTTPS proxy running on https://0.0.0.0:3003 → http://localhost:3002');
  console.log('  /api/transcribe-ws → ws://localhost:3005 (Deepgram WS proxy)');
});
