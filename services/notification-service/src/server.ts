import http from 'node:http';

const port = Number(process.env.PORT || 4004);
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ service: 'notification-service', status: 'ok' }));
});

server.listen(port, () => console.log('notification-service on :' + port));
