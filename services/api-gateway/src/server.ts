import express, { Request, Response } from 'express';
import { graphql, buildSchema } from 'graphql';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';

const app = express();

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
  
  console.log('GraphQL Query:', operationName);
  
  try {
    const schema = buildSchema(typeDefs);
    
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      rootValue: resolvers,
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

app.listen(4000, () => {
  console.log('API Gateway on :4000');
  console.log('GraphQL endpoint: http://localhost:4000/graphql');
  console.log('CORS enabled for all origins');
});
