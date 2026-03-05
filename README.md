# Casino Demo Frontend (Dummy Money)

React + TypeScript frontend for a dummy-money casino demo using GraphQL BFF (Apollo Client), JWT auth with refresh flow, and SSE realtime updates.

## Features

- Protected routes + ADMIN route guard
- Apollo cache as server-state source of truth
- UI-only Zustand store (selected bet amount + toasts)
- Access token in memory + refresh token via httpOnly cookie (expected backend behavior)
- SSE realtime event handling (`walletUpdated`, `betResolved`, `notificationReceived`)
- Error UX with correlation ID banner support
- Optimistic wallet crediting and bet acknowledgement

## Folder Structure

```text
src/
  app/
    App.tsx
    routes.tsx
    providers/
    pages/
    components/
  graphql/
  services/
  state/
  utils/
```

## Environment Variables

Create a `.env` file:

```bash
VITE_GRAPHQL_API_URL=http://localhost:4000/graphql
VITE_REFRESH_URL=http://localhost:4000/auth/refresh
VITE_REALTIME_URL=http://localhost:4000/events
```

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- Dummy money only. No real-money payment/payout integration.
- GraphQL operations are intentionally schema-agnostic stubs and may need field alignment with your backend schema.
