# Casino Management System (Monorepo)

This project is a full-stack casino demo focused on a shared live Russian Roulette game with:

- GraphQL API gateway
- Kafka-backed round result events
- WebSocket push updates to the UI
- React + TypeScript frontend

## Project Architecture

### High-level flow

```txt
Frontend (React)
  ├─ GraphQL (login, placeBet, fallback snapshot)
  └─ WebSocket /realtime (live round/result/wallet/bet updates)
                │
                ▼
      API Gateway (GraphQL + Realtime)
        ├─ Round engine (minute rounds, settlement)
        ├─ Session + wallet + bet state (in memory)
        ├─ Kafka producer (roundResolved, betPlaced)
        └─ Kafka consumer (roundResolved -> push to clients)
```

### Repository structure

```txt
apps/frontend                 # React UI
services/api-gateway          # GraphQL BFF + roulette engine + websocket server
services/auth-service         # scaffold service
services/game-service         # scaffold service
services/wallet-service       # scaffold service
services/notification-service # scaffold service
packages/shared-types         # shared TS models
packages/config               # env + logger helpers
packages/kafka-client         # producer/consumer wrappers
infrastructure/docker         # service Dockerfiles
infrastructure/kafka          # topic bootstrap scripts
scripts/                      # local helper scripts
```

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Apollo Client
- Backend: Node.js, TypeScript, Express, GraphQL (`graphql` package)
- Realtime: native WebSocket (`ws`) at `/realtime`
- Event streaming: Kafka (`kafkajs`)
- Infra: Docker Compose, Zookeeper, Kafka
- Testing: Jest + React Testing Library

## Tools Required

- Node.js 20+
- npm 10+
- Docker Desktop (includes Docker Compose)

## Environment Variables

Copy `.env.example` to `.env` for local runs:

```bash
cp .env.example .env
```

Important frontend env vars:

- `VITE_GRAPHQL_URL` (default: `http://localhost:4000/graphql`)
- `VITE_REALTIME_URL` (optional, default derived from `VITE_GRAPHQL_URL` as `/realtime`)

## How To Run

### Option A: Full stack with Docker (recommended)

```bash
docker compose up --build
```

Endpoints:

- Frontend: `http://localhost:5173` (if you run it locally with `npm run dev`)
- API Gateway GraphQL: `http://localhost:4000/graphql`
- API Gateway WebSocket: `ws://localhost:4000/realtime`
- Auth Service: `http://localhost:4001`
- Game Service: `http://localhost:4002`
- Wallet Service: `http://localhost:4003`
- Notification Service: `http://localhost:4004`

Stop:

```bash
docker compose down
```

### Option B: Frontend only (UI development)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## How To Play The Game

1. Open the app and sign in.
2. Go to `Russian Roulette` page.
3. Wait for an active round (`BETTING` state).
4. Choose bet type:
   - `NUMBER` (0 to 36)
   - `COLOR` (`RED`, `BLACK`, `GREEN`)
   - `ODD_EVEN` (`ODD`, `EVEN`)
5. Enter stake and click `Join Current Round`.
6. The wheel spins when round resolves.
7. Payout rules:
   - NUMBER hit: `36x`
   - COLOR red/black: `2x`
   - COLOR green: `36x`
   - ODD_EVEN: `2x`
8. Wallet and bet history update live via WebSocket.

## Demo Credentials

- `admin@casino.dev` / `password`
- `player@casino.dev` / `password`

## Scripts

From repo root:

- `npm run dev` - frontend dev server
- `npm run build` - frontend production build
- `npm run typecheck` - frontend type-check
- `npm run test` - frontend Jest tests

Frontend workspace directly:

- `npm run test --workspace apps/frontend`

## Notes

- Current wallet/bet/session data is in-memory inside API Gateway. Restarting the gateway resets runtime state.
- Kafka is used for round result/bet event distribution; WebSocket is used for client push updates.
