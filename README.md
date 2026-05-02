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

Goto backend folder by `cd backend` Create `backend/.env`:

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

# Cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_MAIL=your@gmail.com
SMTP_PASSWORD=your_app_password

# Stripe
STRIPE_API_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# ML Server
ML_SERVER_URL=http://127.0.0.1:5000
ML_SECRET=generate_a_random_secret_here
```

> **Generate JWT_SECRET:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords. Use this instead of your real password.

---

### 3. Install backend dependencies

```bash

npm install

```

---

### 4. Verify environment

```bash
npm run verify
```

Checks all required env vars, MongoDB connection, Cloudinary ping, and Stripe account retrieval.

---

### 5. ML Server

```bash
cd mlserver

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install runtime dependencies
pip install -r requirements.txt

# Create mlserver/.env
PORT=5000
FLASK_ENV=development
ALLOWED_ORIGIN=http://localhost:4080
ML_SECRET=same_value_as_backend_ML_SECRET

# Train the model — only needed once
python train_model.py

# Start
python server.py
```

---

### 6. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
# ML recommendations proxy through backend — this is for reference only
REACT_APP_ML_URL=http://127.0.0.1:5000
```

---

### 7. Start all three services

**Terminal 1 — Backend**
```bash
cd backend && npm run dev
# → http://localhost:4080
```

**Terminal 2 — ML Server**
```bash
cd mlserver && source .venv/bin/activate && python server.py
# → http://localhost:5000
```

**Terminal 3 — Frontend**
```bash
cd frontend && npm start
# → http://localhost:3000
```

---

### 8. Create your first admin user

Register through the UI and verify your email, then promote to admin:

```js
// mongosh
use nutrinavigator
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
```

Or use MongoDB Compass — find your user → edit `role` → set to `"admin"` → save.

Log out and back in — the Dashboard link appears in the user menu.

---

### 9. Test the ML server

```bash
curl -X POST http://127.0.0.1:5000/recommend \
  -H "Content-Type: application/json" \
  -H "X-ML-Secret: your_ml_secret" \
  -d '{"age": 28, "height": 1.72, "weight": 68, "gender": 1, "diesease": [1, 7]}'
```

---

### API Documentation

Swagger UI available at `http://localhost:4080/api/docs` in development.
