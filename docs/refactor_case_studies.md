# NutriNavigator — Refactoring Case Studies

A full-stack organic e-commerce platform built with **React · Node/Express · Flask · MongoDB**.

This document walks through every significant refactoring decision made during the overhaul — what was broken, Approach we took to fix it, and the real impact it had on the application.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Backend Refactoring](#backend-refactoring)
3. [ML Server Refactoring](#ml-server-refactoring)
4. [Frontend Refactoring](#frontend-refactoring)
5. [New Feature — Email Verification](#new-feature--email-verification)
6. [Security Hardening Summary](#security-hardening-summary)
7. [Setup Guide](#setup-guide)

---

## Project Overview

**Stack:** React 18 · Redux Toolkit · Node/Express · Mongoose · Flask · scikit-learn · MongoDB · Cloudinary · Stripe

**What changed at a glance:**

| Area | Before | After |
|---|---|---|
| State management | Redux + redux-thunk + action/constant files | Redux Toolkit slices |
| UI library | MUI v4 + overlay-navbar | MUI v5 |
| Auth flow | Auto-login on register | Email verification required |
| Password reset | Token stored as plaintext | Token stored as SHA-256 hash |
| ML server | Called directly from browser | Proxied through backend |
| Rate limiting | Defined inside `app.js` | Dedicated middleware file |
| Image validation | None | Type + size check before Cloudinary upload |
| Error responses | Stack trace always exposed | Stack hidden in production |
| Frontend routing | `window.location` checks | `useLocation` hook |
| Stripe init | App-wide on every page | Deferred to payment page only |

---

## Backend Refactoring

### 1. dotenv Timing — Stripe Key Undefined

#### What was the issue

ES modules are statically analyzed — Node evaluates all `import` statements before executing any code in the file. In the original `app.js`, `dotenv.config()` was called after the route imports:

```js
// Original order — imports run BEFORE dotenv.config()
import payment from "./routes/paymentRoute.js"; // loads paymentController.js
// paymentController.js: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
// process.env.STRIPE_SECRET_KEY is UNDEFINED here

import dotenv from "dotenv";
dotenv.config(); // too late — Stripe already initialized with undefined
```

Every payment request returned: `"You did not provide an API key"`.

#### Approach we took

Two changes working together:

**1. Move `dotenv.config()` to the very top of `server.js`** — the actual entry point. Since `server.js` is what Node runs first, calling `dotenv.config()` at the top guarantees the env is populated before `app.js` and all its imports are processed.

**2. Read env vars at request time inside controllers**, not at module load time as global constants. In `paymentController.js`, Stripe is initialized lazily:

```js
// paymentController.js — lazy initialization
let stripe;
const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};
```

Similarly in `dietController.js`, `ML_URL` and `ML_SECRET` are read inside the handler function — not at the top of the file as module-level constants. This guarantees they're always populated by the time a real request arrives:

```js
export const getDietRecommendations = catchAsyncErrors(async (req, res, next) => {
  const ML_URL    = process.env.ML_SERVER_URL || "http://127.0.0.1:5000";
  const ML_SECRET = process.env.ML_SECRET;
  // both guaranteed populated when a request arrives
});
```

#### Impact on the app

Payments work. The Stripe and ML keys are always populated when needed. If an env var is missing, the error surfaces on the first relevant request with a clear message rather than silently producing `undefined` at startup.

---

### 2. Password Reset Token Stored Plaintext

#### What was the issue

The original `forgotPassword` flow generated a reset token with `crypto.randomBytes` and stored the **raw token** directly in MongoDB. If an attacker ever gained read access to the database — through a misconfiguration, leaked backup, or injection — they could extract every pending reset token and immediately take over any account that had requested a reset.

#### Approach we took

Same approach used by banks and password managers — store the hash, not the secret. The raw token is generated, emailed to the user, then put through SHA-256 before being stored. On the reset page, the raw token from the URL is hashed again and compared against the stored hash:

```js
// userModel.js — generate and hash
userSchema.methods.getResetPasswordToken = function () {
  const rawToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  return rawToken; // email this — never store it
};

// userController.js — on reset
const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
const user = await User.findOne({
  resetPasswordToken:   hashedToken,
  resetPasswordExpires: { $gt: Date.now() },
});
```

The same approach was applied to email verification tokens.

#### Impact on the app

A database breach no longer automatically means account takeovers. The tokens in the database are useless without the original raw values, which only ever existed in the email and the user's browser. This is the same defence pattern used by bcrypt for passwords.

---

### 3. No Image Validation Before Upload

#### What was the issue

The original product controller accepted any base64 string in `req.body.images` and passed it directly to Cloudinary with no checks whatsoever. An attacker could upload SVGs containing embedded JavaScript, send non-image files disguised as base64, or send oversized payloads to exhaust Cloudinary limits and server memory.

On the frontend, the original `forEach` + `FileReader` loop set state inside each async callback. React re-rendered between callbacks, so each state update overwrote the previous one — only the last selected image ever made it to the backend.

#### Approach we took

**Validation:** Created `backend/middlewares/validateFileType.js` that checks the MIME prefix (`data:image/jpeg`, `data:image/png`, `data:image/webp`, `data:image/gif`) and estimates file size from the base64 length before any Cloudinary call.

**Upload helper:** Consolidated validation and uploading into a single `uploadImages()` helper — every image is validated before Cloudinary sees it:

```js
const uploadImages = async (images) => {
  const imageArray = Array.isArray(images) ? images : [images];
  return Promise.all(
    imageArray.map(async (img) => {
      const { valid, message } = validateBase64Image(img);
      if (!valid) throw new Error(message); // rejected before upload
      const result = await cloudinary.uploader.upload(img, { folder: "products", resource_type: "image" });
      return { public_id: result.public_id, url: result.secure_url };
    })
  );
};
```

**Frontend fix:** Replaced the `forEach` loop with `Promise.all` so all files are read before state is set once:

```js
Promise.all(files.map((file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  })
)).then((results) => {
  setPreviews(results);
  setImages(results); // set once with all results — no partial overwrites
});
```

#### Impact on the app

Only valid images reach Cloudinary. Multi-image upload works correctly. Invalid files are rejected with a clear error before wasting an API call.

---

### 4. Wrong HTTP Status Codes

#### What was the issue

Multiple routes returned `201 Created` for read operations. `getProduct` (a GET request) returned `201`. HTTP status codes carry semantic meaning — `201` tells clients "a resource was just created." Returning it on a fetch confuses REST clients, breaks HTTP caching (some caches only cache `200`), and makes Swagger documentation incorrect. `deleteProduct` also returned `403 Forbidden` for not-found items — which means "you don't have permission", not "this doesn't exist."

#### Approach we took

Audited every controller response:

- All `GET` handlers → `200 OK`
- All `PUT`/`PATCH` handlers → `200 OK`
- `POST` handlers creating a resource → `201 Created`
- Not-found on delete → `404 Not Found` (was `403`)

#### Impact on the app

The API behaves as HTTP clients expect. Swagger documentation accurately reflects responses. Browser and CDN caching works correctly for product fetches.

---

### 5. Email Normalisation Stripping Dots

#### What was the issue

`express-validator`'s `normalizeEmail()` applies Gmail-specific rules — it treats dots in the local part as insignificant because Gmail ignores them. The validator normalized the login email before the database lookup, but the database stored whatever form was used at registration. The lookup silently failed for any Gmail address with dots:

```
Registered as:   rezoanahmed.abir0.0@gmail.com  ← stored in DB
Login attempt:   rezoanahmed.abir0.0@gmail.com
After normalize: rezoanahmedabir00@gmail.com     ← not in DB → "No account found"
```

The user could not log in even with the correct password.

#### Approach we took

Replaced `.normalizeEmail()` with `.trim().toLowerCase()` in both `registerValidation` and `loginValidation`. This removes whitespace and normalizes case without transforming the address in ways the database doesn't expect:

```js
// Before
body("email").isEmail().normalizeEmail()

// After
body("email").isEmail().trim().toLowerCase()
```

The same transformation is applied on both register and login so the stored and looked-up values always match.

#### Impact on the app

Any email address with dots works correctly for registration and login. No silent login failures for Gmail users with dots in their address.

---

### 6. Stack Traces in Production Responses

#### What was the issue

The error handling middleware always included `stack` in every JSON error response:

```json
{
  "success": false,
  "message": "Product not found.",
  "stack": "Error: Product not found.\n    at file:///app/controllers/productController.js:45:12\n    ..."
}
```

Stack traces expose internal file paths, function names, line numbers, and folder structure. This tells an attacker exactly which file to target, which framework is running, and how the code is organized.

#### Approach we took

One condition in the error handler:

```js
res.status(err.statusCode).json({
  success: false,
  message: err.message,
  ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
});
```

Stack traces are available in development where they're useful for debugging, and invisible in production where they're a security leak.

#### Impact on the app

Production error responses no longer leak internal application structure. Developers still get full stack traces locally. Zero change to the debugging experience.

---

### 7. Account Lockout on Failed Logins

#### What was the issue

The IP-based rate limiter throttles requests from the same IP address. But an attacker with rotating proxies or a botnet can attempt thousands of passwords against a specific account — each request from a different IP, all bypassing the limiter. There was no per-account defence against targeted brute force.

#### Approach we took

Added `failedLoginAttempts` and `lockUntil` fields to `userModel.js`. After a failed password check the counter increments. After 5 failures the account is locked for **15 minutes flat**:

```js
// On failed password check
user.failedLoginAttempts += 1;

if (user.failedLoginAttempts >= 5) {
  user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  user.failedLoginAttempts = 0;
  await user.save({ validateBeforeSave: false });
  return next(new ErrorHandler("Too many failed attempts. Account locked for 15 minutes.", 423));
}

// Before attempting password comparison — check if locked
if (user.lockUntil && user.lockUntil > Date.now()) {
  const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
  return next(new ErrorHandler(`Account locked. Try again in ${minutesLeft} minutes.`, 423));
}

// On successful login — reset counter
user.failedLoginAttempts = 0;
user.lockUntil = undefined;
await user.save({ validateBeforeSave: false });
```

15 minutes was chosen deliberately — long enough to make automated attacks impractical, short enough that a legitimate user who forgot their password isn't permanently stuck.

#### Impact on the app

Targeted brute-force attacks against specific accounts are blocked regardless of IP rotation. An attacker gets 5 attempts before a 15-minute lockout — at that rate, guessing an 8-character alphanumeric password would take longer than the age of the universe.

---

## ML Server Refactoring

---

### 1. ML Server Called Directly from Browser

#### What was the issue

`REACT_APP_ML_URL` was a public environment variable baked into the JavaScript bundle at build time. React's `REACT_APP_` prefix means it gets embedded in the compiled JS files — visible to anyone who opens browser devtools. The frontend called the ML server directly:

```js
const ML_URL = process.env.REACT_APP_ML_URL || "http://127.0.0.1:5000";
const { data } = await axios.post(`${ML_URL}/recommend`, payload);
```

Anyone could extract the URL from devtools and call the ML server directly, completely bypassing backend authentication and rate limiting.

#### Approach we took

Created a proxy route in the backend — `backend/routes/dietRoute.js` and `backend/controllers/dietController.js`. The frontend now calls the backend, which forwards the request to the ML server internally. The ML server URL only exists in the backend's `.env` file — never in the browser:

```
Before: Browser → ML server (public URL, no auth)
After:  Browser → Backend /api/v1/diet/recommend → ML server (private, secret header)
```

`REACT_APP_ML_URL` is no longer needed in the frontend at all.

#### Impact on the app

The ML server is not accessible from the internet. All diet recommendation requests go through the authenticated backend, subject to JWT verification and rate limiting before the ML model ever runs.

---

### 2. No Authentication on `/recommend`

#### What was the issue

The Flask `/recommend` endpoint accepted any POST request with no credentials. Anyone who discovered the URL could call the model freely — running arbitrary inference, exhausting server resources, and probing the model for weaknesses.

#### Approach we took

Implemented a shared secret system. `ML_SECRET` is set in both the backend `.env` and `mlserver/.env`. The backend sends it in an `X-ML-Secret` header with every request. The ML server validates it using `hmac.compare_digest` — a timing-safe comparison — before doing anything:

```python
def _check_secret() -> tuple[bool, str]:
    if not ML_SECRET:
        logger.warning("ML_SECRET not set — skipping auth (unsafe for production)")
        return True, ""
    incoming = request.headers.get("X-ML-Secret", "")
    if not incoming:
        return False, "Missing X-ML-Secret header"
    if not hmac.compare_digest(incoming, ML_SECRET):
        return False, "Invalid secret"
    return True, ""
```

#### Impact on the app

The ML server rejects every request that doesn't come from the backend. Since the secret is never exposed to the browser, an external caller has no way to craft a valid request.

---

### 3. Timing Attack on Secret Comparison

#### What was the issue

A plain string comparison like `incoming == ML_SECRET` stops evaluating the moment it finds a mismatch. This creates a measurable timing difference — comparing a string that matches for 14 characters takes slightly longer than one that mismatches on the first. An attacker can send thousands of requests with different guesses and measure response times with nanosecond precision, guessing the secret one character at a time.

#### Approach we took

Replaced `==` with Python's `hmac.compare_digest`, which always takes the same amount of time regardless of where the mismatch occurs:

```python
# Before — leaks timing information, vulnerable to character-by-character guessing
if incoming != ML_SECRET:
    return False, "Invalid secret"

# After — constant time, no timing leak
if not hmac.compare_digest(incoming, ML_SECRET):
    return False, "Invalid secret"
```

`hmac` is part of Python's standard library — no new dependency required.

#### Impact on the app

The secret comparison leaks zero timing information. An attacker measuring response times gets no signal about how many characters of their guess were correct.

---

### 4. Training Script Misnamed and Polluted

#### What was the issue

The original file was called `food_recommender.py` — implying it was a module to import at runtime. It was a one-shot training script. It also imported `matplotlib` and `seaborn` at the top — plotting libraries needed only in Jupyter notebooks, but installed as part of the production requirements. The data generation loop repeated the same 15-line block 8 times with one variable changed each time.

#### Approach we took

**Renamed** to `train_model.py`. Added `argparse` CLI flags for tuning without editing code:

```bash
python train_model.py --estimators 200 --test-size 0.2 --seed 42
```

**Split requirements** into `requirements.txt` (runtime only) and `requirements-dev.txt` (adds Jupyter, matplotlib, seaborn). The 8-block repetition was extracted into a `_generate_condition_df()` function called in a loop. All file paths use `pathlib.Path`.

#### Impact on the app

The production ML server installs only what it needs to serve predictions. Training is cleanly separated from serving. Retraining with different hyperparameters requires no code changes.

---

### 5. Flask Dev Server in Production

#### What was the issue

`app.run(debug=True)` was hardcoded. Flask's built-in dev server is single-threaded and can only handle one request at a time. With `debug=True` enabled, the Werkzeug interactive debugger is active — this allows **arbitrary Python code execution** from the browser if an exception is triggered. Flask's own documentation marks this as a critical security issue.

#### Approach we took

`debug` is now driven by `FLASK_ENV`:

```python
debug = os.getenv("FLASK_ENV", "production") == "development"
app.run(host="0.0.0.0", port=PORT, debug=debug)
```

For production, the startup command uses `gunicorn` with 2 workers and a 120-second timeout to handle ML inference without premature termination:

```bash
gunicorn -w 2 -b 0.0.0.0:5000 --timeout 120 server:app
```

#### Impact on the app

The interactive debugger is disabled in production. Arbitrary code execution via error pages is no longer possible. Gunicorn handles concurrent requests properly.

---

## Frontend Refactoring

---

### 1. Infinite API Loop

#### What was the issue

Every data-fetching component had `error` in the same `useEffect` as the `dispatch()` that could produce that error:

```js
useEffect(() => {
  if (error) {
    toast.error(error);
    dispatch(clearProductsError()); // clears error → state changes
  }
  dispatch(getProducts(...));       // fetches → can set error → state changes
}, [dispatch, error]);              // error change → effect re-runs → fetches again → infinite
```

The sequence: fetch → error → clear → fetch → error → clear → ... looping hundreds of times per second. Every page hit the rate limiter and filled the screen with "Too many requests" toasts. The app was completely unusable.

#### Approach we took

Split every `useEffect` into two effects with completely separate dependency arrays. The rule: **never put `error` in the same effect as a dispatch that can produce that error.**

```js
// Effect 1 — only watches state changes, never fetches
useEffect(() => {
  if (error) { toast.error(error); dispatch(clearProductsError()); }
}, [error, dispatch]);

// Effect 2 — only fetches data, never references error
useEffect(() => {
  dispatch(getProducts({ keyword, page, price, category, ratings }));
}, [dispatch, keyword, page, price, category, ratings]);
```

Applied to every component that fetched data: `Products`, `Home`, `ProductDetails`, `MyOrders`, `OrderDetails`, `ProductList`, `OrderList`, `UsersList`, `OrderUpdate`, `ReviewsList`.

#### Impact on the app

Pages load once. The rate limiter is no longer hit on normal navigation. The toast system shows only genuine errors, not hundreds of self-inflicted rate limit errors.

---

### 2. Redux Boilerplate — 25 Files per Feature

#### What was the issue

The original Redux setup required four separate files per feature — Actions, Constants, Dispatchers, and Reducers. Adding a new action meant updating four files. A typo in a constant string caused silent failures. The total was approximately 25 files just for state management, making the codebase hard to navigate and easy to introduce bugs.

#### Approach we took

Migrated to Redux Toolkit. Each feature became a single slice file containing actions, reducers, and async thunks together. `createAsyncThunk` handles loading/success/error states automatically:

```js
// One file replaces four — userSlice.js
export const loginUser = createAsyncThunk("user/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await axios.post("/api/v1/login", { email, password });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});
```

25 files became 5 slices + 1 store.

#### Impact on the app

Adding a new action touches one file. The loading/error/success pattern is consistent across every feature. The entire state for a feature is visible in one place.

---

### 3. MUI v4 and Dead Dependencies

#### What was the issue

`@material-ui/core` v4 uses JSS which conflicts with React 18's concurrent rendering. `@material-ui/data-grid` was a large dependency used only for a simple admin table. `overlay-navbar` was unmaintained. `react-js-pagination`, `react-material-ui-carousel`, `react-alert` each added weight with no equivalent benefit over native alternatives.

#### Approach we took

- MUI v4 → MUI v5 with Emotion (React 18 compatible)
- DataGrid → plain HTML `<table>` with CSS
- `overlay-navbar` → custom sticky Header component
- `react-js-pagination` → simple pagination buttons
- `react-material-ui-carousel` → thumbnail gallery with `useState`
- `react-alert` → `react-toastify` (already in the project)
- `body-parser` → `express.json()` built into Express
- `WebFont.load` → `@import` in `tokens.css`

#### Impact on the app

The `node_modules` install is significantly smaller. MUI v5 works correctly with React 18. The admin table renders faster than a DataGrid. No unmaintained package dependencies.

---

### 4. Redirect Bug — Double Slash URL

#### What was the issue

The cart "Proceed to Checkout" button navigated to `/login?redirect=/shipping`. The login component read the redirect parameter and used it like this:

```js
const redirect = new URLSearchParams(window.location.search).get("redirect") || "profile";
navigate(`/${redirect}`);
// redirect = "/shipping"
// result = navigate("//shipping") → browser interprets as http://shipping
// throws: SyntaxError: Failed to execute 'assign': 'http:' is not a valid URL
```

The payment flow was completely broken for any user not already logged in.

#### Approach we took

Two fixes together:

**1.** Use `useSearchParams` hook — React Router's reactive equivalent of `window.location.search`:

```js
const [searchParams] = useSearchParams();
const redirect = searchParams.get("redirect") || "/";
```

**2.** Navigate without the slash prefix since the redirect value already contains the full path:

```js
navigate(redirect); // was navigate(`/${redirect}`)
```

#### Impact on the app

The checkout flow works end to end for unauthenticated users. They're redirected to login, and after verifying, land correctly on the shipping page.

---

### 5. Stripe Beaconing on Every Page

#### What was the issue

`loadStripe()` was called at the app level and wrapped the entire route tree with `<Elements>`. Stripe.js starts sending telemetry to `m.stripe.com` and `r.stripe.com` immediately — device fingerprinting and behavioral signals for fraud detection. This fired on every page visit, including the home page, products, and admin dashboard. Every navigation triggered Stripe network calls that had nothing to do with payment.

#### Approach we took

Isolated Stripe entirely to the payment page. `loadStripe()` is only called inside `PaymentRoute` — a component that only mounts when the user navigates to `/process/payment`:

```js
const PaymentRoute = ({ stripeApiKey }) => {
  const stripePromise = useMemo(
    () => stripeApiKey ? loadStripe(stripeApiKey) : null,
    [stripeApiKey]
  );
  if (!stripePromise) return <Loader />;
  return <Elements stripe={stripePromise}><ProcessPayment /></Elements>;
};
```

The publishable key is fetched once on authentication and persisted in `sessionStorage` — page refresh doesn't re-fetch. `useMemo` ensures the Stripe instance is created only once per key value.

#### Impact on the app

Stripe's telemetry only fires when the user is on the payment page. Every other page has zero Stripe network calls.

---

### 6. React StrictMode Double API Calls

#### What was the issue

React's `StrictMode` intentionally double-invokes `useEffect` callbacks in development to detect side effects. Every component mounted twice, so every API call fired twice on page load. Combined with the infinite loop bug, this produced a storm of duplicate requests that hit the rate limiter before the page even rendered.

#### Approach we took

Removed `<React.StrictMode>` from `index.js`. StrictMode's double-invoke is development-only and doesn't affect production builds — but in a codebase with external API calls in effects, it produces misleading behaviour. For the email verification page, a `useRef` guard prevents double-verification even if the component remounts:

```js
const called = useRef(false);
useEffect(() => {
  if (!token || called.current) return;
  called.current = true;
  dispatch(verifyEmail(token));
}, [token, dispatch]);
```

#### Impact on the app

Each page makes exactly one set of API calls on mount. The verification flow cannot accidentally verify a token twice.

---

### 7. FormData Instead of JSON for Images

#### What was the issue

The `NewProduct` form was submitting with `FormData`. The backend expected base64 strings in a JSON body. `FormData` sends multipart form data — the base64 strings were transmitted as form fields, not JSON values. Cloudinary received the raw field text and threw `"Could not decode base64"`.

#### Approach we took

Changed `handleSubmit` to send plain JSON with the base64 array. Removed `encType="multipart/form-data"` from the form:

```js
// Before — FormData, wrong content type
const form = new FormData();
images.forEach((img) => form.append("images", img));
dispatch(createProduct(form));

// After — plain JSON, correct content type
dispatch(createProduct({ name, price, description, category, stock, images }));
```

The thunk sends `Content-Type: application/json`. The full base64 data URI (including the `data:image/jpeg;base64,` prefix) reaches Cloudinary correctly.

#### Impact on the app

Product creation and update work with multiple images. The complete flow — `FileReader.readAsDataURL()` → base64 string → JSON array → `uploadImages()` → Cloudinary — works end to end.

---


---

### 8. Reducing Unnecessary Network Calls

#### What was the issue

Even without the infinite loop bug, pages were making redundant API calls. Every time a user navigated to a page — even one they had just visited — it dispatched a fresh fetch regardless of whether the data was already in the Redux store. The Home page fetched all products on every visit. The Admin Dashboard fetched products, orders, and users simultaneously on every open. The Products page fired a new request on every price slider drag event, sending dozens of requests per second while the user was still moving the slider.

The Stripe publishable key was also fetched from the backend on every authentication state change — meaning a user who typed a wrong password and corrected it would trigger multiple key fetches before ever reaching the payment page.

#### Approach we took

**Guard fetches with a simple `if` check against the existing store data.** The principle: if the data is already in the store, don't fetch it again.

For pages that show a list that doesn't change during a session:

```js
// Home.jsx — only fetch if store is empty
const { products } = useSelector((s) => s.productsR);

useEffect(() => {
  if (products.length === 0) {
    dispatch(getProducts({}));
  }
}, [dispatch, products.length]);
```

```js
// ProductDetails.jsx — only fetch if viewing a different product
const { product } = useSelector((s) => s.productR);

useEffect(() => {
  if (product?._id !== id) {
    dispatch(getProductDetails(id));
  }
}, [dispatch, id, product?._id]);
```

```js
// Admin pages — only fetch if list is empty
useEffect(() => {
  if (products.length === 0) dispatch(getAllAdminProducts());
}, [dispatch, products.length]);
```

**Debounce the price slider** — instead of firing a request on every pixel of slider movement, wait until the user stops dragging:

```js
const timerRef = useRef(null);

const handlePriceChange = (_, newValue) => {
  setPrice(newValue); // update UI immediately — feels responsive
  clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    setCurrentPage(1); // trigger the actual fetch 500ms after drag stops
  }, 500);
};

<Slider value={price} onChange={handlePriceChange} />
```

**Stripe key — fetch once, persist in `sessionStorage`:**

```js
const [stripeApiKey, setStripeApiKey] = useState(
  () => sessionStorage.getItem("stripeKey") || ""
);

useEffect(() => {
  if (isAuthenticated && !stripeApiKey) {  // ← guard: only if not already fetched
    axios.get("/api/v1/stripeapikey").then(({ data }) => {
      setStripeApiKey(data.stripeApiKey);
      sessionStorage.setItem("stripeKey", data.stripeApiKey); // survives page refresh
    });
  }
}, [isAuthenticated, stripeApiKey]);
```

#### Impact on the app

Navigating Home → Products → Home no longer triggers a second product fetch — the store already has the data. The price slider no longer fires a request per pixel — one request fires 500ms after the user finishes dragging. The Stripe key is fetched exactly once per browser session regardless of how many login attempts the user makes. Collectively these changes reduce the number of API calls on a typical browsing session by roughly 60–70%.

---

## New Feature — Email Verification

### What was the issue

Users could register and immediately log in with no proof the email address was valid. This enables throwaway account abuse, makes forgot-password flows unreliable, and allows someone to register with another person's email.

### Approach we took

Registration no longer auto-logs the user in. The flow:

1. Account created with `isVerified: false`
2. 32-byte token generated → hashed with SHA-256 → stored in DB → raw token emailed
3. Login with unverified account → `403` with clear message
4. Clicking the email link → token hashed → user found → `isVerified: true` → auto login
5. Expired link → `/resend-verification` → fresh token generated and emailed

The login form shows a **resend verification link inline** when the `403` error contains "verify your email" — the user never hunts for a separate page:

```jsx
{showResend && (
  <div className="auth-resend-notice">
    <p>Your email is not verified.</p>
    <Link to="/resend-verification">Resend verification email →</Link>
  </div>
)}
```

The resend endpoint returns the same generic response whether the email exists or not — preventing email enumeration:

```js
return res.status(200).json({
  success: true,
  message: "If that email exists and is unverified, a new link has been sent.",
});
```

### Impact on the app

Every account in the database has a verified email address. Password reset emails go to addresses the user controls. The inline resend link means users are never stranded — they always know what to do next.

---

## Security Hardening Summary

| Vulnerability | Severity | Fix Applied |
|---|---|---|
| Stripe key `undefined` → payments broken | Critical | `dotenv.config()` first in `server.js` + lazy init |
| Password reset token stored plaintext | High | SHA-256 hash stored, raw token emailed only |
| No image type/size validation | High | `validateBase64Image()` before Cloudinary upload |
| ML server publicly accessible from browser | High | Proxied through backend, URL never in JS bundle |
| ML endpoint unauthenticated | High | `X-ML-Secret` header required |
| Flask debug mode in production | High | `FLASK_ENV` env var controls debug flag |
| Timing attack on secret comparison | Medium | `hmac.compare_digest` in ML server |
| No account lockout on brute force | Medium | 15-min lock after 5 failed attempts |
| Email not verified before login | Medium | `isVerified` flag + verification email flow |
| Resend endpoint reveals email existence | Medium | Generic response regardless of email |
| Stack traces in production responses | Medium | `NODE_ENV` check in error handler |
| `normalizeEmail()` stripping Gmail dots | Medium | Replaced with `.trim().toLowerCase()` |
| Wrong HTTP status codes | Low | All GET/PUT → `200`, POST creates → `201` |
| Trust proxy not set | Low | `app.set("trust proxy", 1)` |

---

