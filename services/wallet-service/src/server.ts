import http from 'node:http';

const port = Number(process.env.PORT || 4003);
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ service: 'wallet-service', status: 'ok' }));
});

server.listen(port, () => console.log('wallet-service on :' + port));
