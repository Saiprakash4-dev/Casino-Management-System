import express, { Request, Response } from 'express';
import http, { IncomingMessage } from 'node:http';
import { graphql, buildSchema } from 'graphql';
import { WebSocket, WebSocketServer } from 'ws';
import { typeDefs } from './schema/typeDefs';
import { initializeRouletteSystem, registerRealtimeClient, ResolverContext, resolvers, type RealtimeMessage } from './resolvers';

const app = express();
const schema = buildSchema(typeDefs);

// CORS middleware - must be first
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Content-Type', 'application/json');
  
  console.log(`[${_req.method}] ${_req.path}`);
  
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Simple GraphQL endpoint
app.post('/graphql', async (req: Request, res: Response) => {
  const { query, variables, operationName } = req.body;
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const context: ResolverContext = { token };
  
  console.log('GraphQL Query:', operationName);
  
  try {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      rootValue: resolvers,
      contextValue: context,
    });

    console.log('GraphQL Result:', result.errors ? 'ERROR' : 'OK');
    res.json(result);
  } catch (error: any) {
    console.error('GraphQL Error:', error.message);
    res.status(400).json({ errors: [{ message: error.message }] });
  }
});

app.get('/', (_req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

const extractSocketToken = (req: IncomingMessage) => {
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (!req.url) return '';
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    return (url.searchParams.get('token') || '').trim();
  } catch {
    return '';
  }
};

const httpServer = http.createServer(app);
const wsServer = new WebSocketServer({ server: httpServer, path: '/realtime' });

wsServer.on('connection', (socket, request) => {
  const token = extractSocketToken(request);
  if (!token) {
    socket.close(4401, 'Missing auth token');
    return;
  }

  const detach = registerRealtimeClient(token, (message: RealtimeMessage) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });

  if (!detach) {
    socket.close(4401, 'Invalid auth token');
    return;
  }

  socket.on('message', (raw) => {
    let payload: any;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (payload?.type === 'ping' && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'pong' }));
    }
  });

  socket.on('close', detach);
  socket.on('error', detach);
});

httpServer.listen(4000, async () => {
  console.log('API Gateway on :4000');
  console.log('GraphQL endpoint: http://localhost:4000/graphql');
  console.log('Realtime endpoint: ws://localhost:4000/realtime');
  console.log('CORS enabled for all origins');
  try {
    await initializeRouletteSystem();
  } catch (error) {
    console.error('Roulette system initialization failed:', error);
  }
});
