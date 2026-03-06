# Casino Management System (Monorepo)

A full-stack demo that mirrors a production-style casino platform with:

- React + TypeScript frontend
- GraphQL API Gateway (BFF pattern)
- Domain microservices (Auth, Game, Wallet, Notification)
- Shared packages for types/config/Kafka helpers
- Docker + Kafka local infrastructure

## Repository Structure

```txt
apps/frontend                 # React UI
services/api-gateway          # GraphQL BFF
services/auth-service         # login, JWT, roles
services/game-service         # game catalog, bets, game events
services/wallet-service       # balance, credits, transactions
services/notification-service # consume events, websocket notifications
packages/shared-types         # shared TS models
packages/config               # env + logger helpers
packages/kafka-client         # producer/consumer wrappers
infrastructure/docker         # service Dockerfiles
infrastructure/kafka          # topic bootstrap scripts
scripts/                      # local helper scripts
```

---

## Run Locally (Fastest Path)

### 1) Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose (for full stack)

### 2) Setup

```bash
cp .env.example .env
npm install
```

### 3) Run only frontend (UI development)

```bash
npm run dev
```

Open: `http://localhost:5173`

### 4) Build frontend

```bash
npm run build
```

---

## Run Full Stack Locally (Docker)

This starts Kafka, Zookeeper, API gateway, and all microservices:

```bash
docker compose up --build
```

Services:

- API Gateway: `http://localhost:4000`
- Auth Service: `http://localhost:4001`
- Game Service: `http://localhost:4002`
- Wallet Service: `http://localhost:4003`
- Notification Service: `http://localhost:4004`

Stop everything:

```bash
docker compose down
```

---

## Free Deployment Guide (Recommended)

You can deploy this **for free** using:

- **Vercel** (frontend)
- **Render** (backend services + gateway)
- **Upstash Kafka** (free Kafka cluster)

> Note: free tiers sleep after inactivity and have usage limits, but this is perfect for portfolio demos.

### A) Deploy Frontend to Vercel (Free)

1. Push repo to GitHub.
2. In Vercel, import the repo.
3. Configure:
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm run build --workspace apps/frontend`
   - **Output Directory**: `apps/frontend/dist`
4. Add env var in Vercel (example):
   - `VITE_GRAPHQL_URL=https://<your-gateway-url>/graphql`
5. Deploy.

### B) Deploy Services to Render (Free)

Create one Render Web Service per backend:

- `services/api-gateway`
- `services/auth-service`
- `services/game-service`
- `services/wallet-service`
- `services/notification-service`

For each service:

- Runtime: Node
- Build command: `npm install`
- Start command: `node src/server.ts` (replace with your transpiled command once you add TS build pipeline)
- Add environment variables from `.env.example`

### C) Provision Kafka (Upstash Free)

1. Create a free Upstash Kafka cluster.
2. Copy broker credentials.
3. Set service env vars:
   - `KAFKA_BROKER`
   - `KAFKA_USERNAME`
   - `KAFKA_PASSWORD`
4. Update producer/consumer code to use authenticated broker settings.

### D) Wire everything together

1. Put backend public URLs into API Gateway config.
2. Put Gateway URL into frontend env (`VITE_GRAPHQL_URL`).
3. Redeploy frontend and gateway.

---

## Notes

- This repo is an intentionally clean scaffold; extend each service with persistent DBs, robust auth, retries, observability, and CI/CD.
- Keep all UI work under `apps/frontend` (root-level legacy UI files were removed to avoid duplicate entry points).
