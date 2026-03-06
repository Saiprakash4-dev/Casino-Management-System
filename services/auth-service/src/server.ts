import http from 'node:http';

const port = Number(process.env.PORT || '4001');
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ service: 'auth-service', status: 'ok' }));
});

server.listen(port, () => console.log('auth-service on :' + port));
