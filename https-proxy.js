const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');

const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:3002',
  ws: true
});

const server = https.createServer({
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem')
}, (req, res) => {
  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(3003, '0.0.0.0', () => {
  console.log('HTTPS proxy running on https://0.0.0.0:3003 → http://localhost:3002');
});
