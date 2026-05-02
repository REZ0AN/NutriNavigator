import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import cors from "cors";
import helmet from "helmet";
import { globalLimiter } from "./middlewares/rateLimitMiddleware.js";

// Swagger
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";

// Routes
import productRouter from "./routes/productRoute.js";
import userRouter from "./routes/userRoute.js";
import orderRouter from "./routes/orderRoute.js";
import paymentRouter from "./routes/paymentRoute.js";
import dietRouter from "./routes/dietRoute.js";
// Middleware
import errorHandler from "./middlewares/errorHandlingMiddleware.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "https://js.stripe.com"],
      frameSrc:    ["https://js.stripe.com", "https://hooks.stripe.com"],
      connectSrc:  ["'self'", "https://api.stripe.com"],
      imgSrc:      ["'self'", "data:", "https://res.cloudinary.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
    },
  },
}));

app.use(
    cors({
        origin: process.env.FRONT_END_URI || "http://localhost:3000",
        credentials: true, // required for httpOnly cookie to be sent cross-origin
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(globalLimiter);


// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(fileUpload());

// ─── API Documentation (Swagger) ──────────────────────────────────────────────
app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "NutriNavigator API",
        customCss: ".swagger-ui .topbar { background-color: #1A3C2E; }",
    })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1", productRouter);
app.use("/api/v1", userRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", paymentRouter);
app.use("/api/v1", dietRouter);

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

export default app;
