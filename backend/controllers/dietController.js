import axios from "axios";
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";
import ErrorHandler from "../utils/errorHandler.js";

export const getDietRecommendations = catchAsyncErrors(async (req, res, next) => {
  const { age, height, weight, gender, diesease } = req.body;
  const ML_URL    = process.env.ML_SERVER_URL || "http://127.0.0.1:6060";
  const ML_SECRET = process.env.ML_SECRET;
  if (!age || !height || !weight || gender === undefined || !diesease) {
    return next(new ErrorHandler("All fields are required", 422));
  }
  const { data } = await axios.post(
    `${ML_URL}/recommend`,
    { age, height, weight, gender, diesease },
    { headers: { "X-ML-Secret": ML_SECRET } }
  );

  // Normalize — strip Bengali text, keep only the English name
  // e.g. "Apple (আপেল)" → "Apple"
  const recommended_foods = data.recommended_foods.map(
    (food) => food.split("(")[0].trim()
  );

  res.status(200).json({ recommended_foods });
});