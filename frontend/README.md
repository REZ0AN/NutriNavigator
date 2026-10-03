# NutriNavigator Frontend

The frontend is a React and Redux application. It owns presentation and
browser state, but never decides authoritative prices, stock, permissions, or
payment status.

## Local setup

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

The development server runs at `http://localhost:3000`.

Development API requests use the proxy configured in `package.json`. In the
Docker image, Nginx serves the production build on port `80` and proxies
`/api/` to `http://backend:8080`.

The frontend does not need the Gemini key, recommendation-service secret,
Stripe secret key, or any other server secret. A publishable Stripe key may be
returned by the backend when the payment page is opened.

## Tests and build

```bash
npm test -- --watchAll=false
npm run build
```
