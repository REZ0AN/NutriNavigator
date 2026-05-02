import express from "express";
import { getDietRecommendations } from "../controllers/dietController.js";
import { isAuthenticatedUser } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";
const router = express.Router();
router.post("/diet/recommend", isAuthenticatedUser, authLimiter, getDietRecommendations);

export default router;