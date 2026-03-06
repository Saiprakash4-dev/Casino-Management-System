import http from 'node:http';

const port = Number(process.env.PORT || 4002);
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ service: 'game-service', status: 'ok' }));
});

server.listen(port, () => console.log('game-service on :' + port));
