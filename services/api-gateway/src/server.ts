import http from 'node:http';

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ service: 'api-gateway', status: 'ok' }));
});

server.listen(4000, () => console.log('API Gateway on :4000'));
