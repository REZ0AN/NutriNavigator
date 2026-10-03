## Setup Guide

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
PORT=4080
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
cd recommendation_service

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install runtime dependencies
pip install -r requirements.txt

# Create recommendation_service/.env
PORT=5000
APP_ENV=development
GEMINI_API_KEY=your-google-ai-studio-api-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
GEMINI_MODEL=gemma-4b-it
RECOMMENDATION_SERVICE_SECRET=same_value_as_backend_RECOMMENDATION_SERVICE_SECRET

# Start
uvicorn server:app --host 0.0.0.0 --port 5000
```

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
# → http://localhost:4080
```

**Terminal 2 — Recommendation service**
```bash
cd recommendation_service && source .venv/bin/activate && uvicorn server:app --host 0.0.0.0 --port 5000
# → http://localhost:5000
```

**Terminal 3 — Frontend**
```bash
cd frontend && npm start
# → http://localhost:3000
```

---

### 8. Run with Docker Compose

Copy the root environment template and fill in the required secrets:

```bash
cp .env.example .env
docker compose up --build
```

The Compose stack starts MongoDB, the recommendation service, the backend, and
the Nginx-served frontend. The frontend is available at
`http://localhost:3000` and the backend at `http://localhost:4080`. Compose
reads values dynamically from the root `.env`; do not commit that file.

To stop the stack while preserving MongoDB data:

```bash
docker compose down
```

To explicitly remove the local MongoDB volume as well:

```bash
docker compose down -v
```

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

Swagger UI available at `http://localhost:4080/api/docs` in development.
