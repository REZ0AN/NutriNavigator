# NutriNavigator

This repository runs three services: `backend/` (Express API), `frontend/`
(React application), and `services/recommendation/` (FastAPI and Gemini).
The Compose service is still named `recommendation_service`; that name is
used for container DNS and is separate from its folder path. MongoDB is
external to this Compose stack.

## Setup Guide

Run each command block from the repository root unless it says otherwise.

### Prerequisites

- Node.js v20+
- Python 3.11+
- MongoDB (local or Atlas)
- Cloudinary account
- Stripe account (test mode)
- Gmail account or any SMTP provider

---

### 1. Clone

```bash
git clone https://github.com/REZ0AN/NutriNavigator.git
cd NutriNavigator
```

---

### 2. Backend environment

Create `backend/.env` using the same variable names as [`backend/.env.example`](backend/.env.example):

```env
# Server
PORT=8080
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/nutrinavigator

# Auth
JWT_SECRET=generate_with_node_crypto_min_32_chars
JWT_EXPIRE=7d
COOKIE_EXPIRE=7

# Frontend URL (CORS + email verification links)
FRONT_END_URI=http://localhost:3000

# Bcrypt
SALT=10

# Cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_MAIL=your@gmail.com
SMTP_PASS=your_app_password

# Stripe
STRIPE_API_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Recommendation Service
RECOMMENDATION_SERVICE_URL=http://127.0.0.1:5000
RECOMMENDATION_SERVICE_SECRET=use_the_same_random_secret_as_recommendation_service
```

> **Generate JWT_SECRET:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords. Use this instead of your real password.

---

### 3. Install backend dependencies

```bash
cd backend
npm install
```

---

### 4. Verify environment

```bash
cd backend
npm run verify
```

Checks all required env vars, MongoDB connection, Cloudinary ping, and Stripe account retrieval.

---

### 5. Recommendation service

```bash
cd services/recommendation
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `GEMINI_API_KEY` in `services/recommendation/.env` and set
`RECOMMENDATION_SERVICE_SECRET` to the same value as in `backend/.env`.
The backend alone calls this service; the frontend calls the backend route.
Start Uvicorn after configuring the environment, as shown in step 7.

---

### 6. Frontend

```bash
cd frontend
npm install
```

The frontend does not need an LLM API key or recommendation-service secret.
It calls the authenticated backend recommendation route.

---

### 7. Start all three services

**Terminal 1 — Backend**
```bash
cd backend && npm run dev
# → http://localhost:8080
```

**Terminal 2 — Recommendation service**
```bash
cd services/recommendation && source .venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 5000
# → http://localhost:5000
```

**Terminal 3 — Frontend**
```bash
cd frontend && npm start
# → http://localhost:3000
```

---

### 8. Run with Docker Compose

Create the root Compose environment file and the three service environment
files. The root `.env` contains only Compose interpolation values; application
secrets stay in the service-specific files:

```bash
make init-env
# Edit backend/.env and services/recommendation/.env with real secrets.
make config
make up-d
```

The current Compose stack contains three services:

| Service | Container address | Host address | Purpose |
| --- | --- | --- | --- |
| `recommendation_service` | `http://recommendation_service:5000` | internal only | FastAPI + Gemini recommendations |
| `backend` | `http://backend:8080` | `http://localhost:4080` | Express API, MongoDB, Stripe, auth |
| `frontend` | Nginx on port `80` | `http://localhost:3000` | React application |

The backend connects to the recommendation service through Compose DNS. The
frontend Nginx proxy connects to `backend:8080`. MongoDB is not managed by this
Compose file; set `MONGODB_URI` in `backend/.env` to Atlas or another reachable
MongoDB instance. Keep `PORT=8080` in `backend/.env` for the Compose port
mapping and health check.

To stop the stack:

```bash
docker compose down
```

Equivalent Makefile commands are available with `make ps`, `make logs`,
`make backend-logs`, `make recommendation-logs`, and `make frontend-logs`.

---

### 9. Create your first admin user

Register through the UI and verify your email, then promote to admin:

```js
// mongosh
use nutrinavigator
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
```

Or use MongoDB Compass — find your user → edit `role` → set to `"admin"` → save.

Log out and back in — the Dashboard link appears in the user menu.

---

### 10. Test the recommendation service

```bash
curl -X POST http://127.0.0.1:5000/recommend \
  -H "Content-Type: application/json" \
  -H "X-Recommendation-Secret: your_recommendation_service_secret" \
  -d '{"age": 28, "height": 1.72, "weight": 68, "gender": 1, "diseases": [1, 7]}'
```

---

### API Documentation

Swagger UI available at `http://localhost:8080/api/docs` in local development,
or `http://localhost:4080/api/docs` through the default Docker host mapping.

More service-specific setup and API notes:

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Recommendation service README](services/recommendation/README.md)
