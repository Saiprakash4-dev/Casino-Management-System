# Casino Management System (Monorepo)

A full-stack microservices demo with a React + TypeScript frontend, GraphQL BFF gateway, domain services, and Kafka-ready infrastructure.

## Structure

- `apps/frontend`: UI, GraphQL client, auth/realtime providers, and feature pages.
- `services/*`: API gateway, auth, game, wallet, and notification services.
- `packages/*`: shared types, config/logger helpers, and Kafka utilities.
- `infrastructure/*`: Dockerfiles + Kafka setup scripts.
- `scripts/*`: local helper scripts.

## Quick Start

1. Copy envs
   - `cp .env.example .env`
2. Install dependencies
   - `npm install`
3. Start frontend
   - `npm run dev`
4. Start full stack with containers
   - `docker compose up --build`

## Architecture

- **Frontend** calls **API Gateway** only.
- **API Gateway** orchestrates auth/game/wallet services via GraphQL.
- **Game & Wallet services** publish events.
- **Notification service** consumes events and emits real-time updates.

## Notes

This scaffold is intentionally lightweight so you can expand each service into production-grade modules (DB adapters, auth hardening, observability, retries, and CI/CD).
