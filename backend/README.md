# NutriNavigator Backend

The backend is an Express API responsible for authentication, catalog data,
reviews, orders, stock reservations, Stripe payments/webhooks, and admin APIs.
It owns server-side authorization, pricing, inventory, and payment checks.

## Local setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The local server listens on the value of `PORT` (the example uses `8080`):

```text
http://localhost:8080
http://localhost:8080/api/docs
```

For local recommendation calls, use:

```env
RECOMMENDATION_SERVICE_URL=http://127.0.0.1:5000
```

Docker Compose overrides this with the internal service URL
`http://recommendation_service:5000`.

## Environment and tests

`backend/.env` contains MongoDB, JWT, Cloudinary, SMTP, Stripe, and
recommendation-service settings. The recommendation secret must exactly match
`services/recommendation/.env`.

```bash
npm run verify
npm test -- --runInBand
RUN_DB_INTEGRATION=true npm run test:integration
```

Integration tests use MongoDB Memory Server and require permission to bind a
local test port.
