import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";
import ErrorHandler from "../utils/errorHandler.js";
import Product from "../models/productModel.js";
import { requestRecommendations } from "../services/recommendationService.js";

const MAX_RECOMMENDATIONS = 8;

const normalizeFoodName = (name) => name.trim().replace(/\s+/g, " ").toLowerCase();
const escapeRegex = (value) => value.replace(/[$.*+?^()|[\]\\]/g, "\\$&");
const tokenizeFoodName = (name) => normalizeFoodName(name)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);

const findBestProduct = (recommendationName, products) => {
    const normalizedRecommendation = normalizeFoodName(recommendationName);
    const recommendationTokens = new Set(tokenizeFoodName(recommendationName));

    return products
        .map((product) => {
            const productName = normalizeFoodName(product.name);
            const matchingWords = tokenizeFoodName(product.name)
                .filter((word) => recommendationTokens.has(word));
            return {
                product,
                exactMatch: productName === normalizedRecommendation,
                score: new Set(matchingWords).size,
            };
        })
        .filter(({ score }) => score > 0)
        .sort((left, right) => {
            if (left.exactMatch !== right.exactMatch) return left.exactMatch ? -1 : 1;
            if (left.score !== right.score) return right.score - left.score;
            return left.product.name.length - right.product.name.length;
        })[0]?.product || null;
};

const validateProfile = ({ age, height, weight, gender, diseases }) => {
    const numericAge = Number(age);
    const numericHeight = Number(height);
    const numericWeight = Number(weight);
    const numericGender = Number(gender);

    if (!Number.isFinite(numericAge) || numericAge < 1 || numericAge > 120) {
        return "Age must be between 1 and 120.";
    }
    if (!Number.isFinite(numericHeight) || numericHeight < 0.5 || numericHeight > 3) {
        return "Height must be between 0.5 and 3 metres.";
    }
    if (!Number.isFinite(numericWeight) || numericWeight < 10 || numericWeight > 300) {
        return "Weight must be between 10 and 300 kg.";
    }
    if (![0, 1].includes(numericGender)) {
        return "Gender must be 0 or 1.";
    }
    if (!Array.isArray(diseases) || diseases.length > 10 || diseases.some((code) => !Number.isInteger(code) || code < 0 || code > 7)) {
        return "Diseases must contain integer codes from 0 through 7.";
    }
    return null;
};

export const getDietRecommendations = catchAsyncErrors(async (req, res, next) => {
    const { age, height, weight, gender, diseases } = req.body;
    const validationError = validateProfile({ age, height, weight, gender, diseases });
    if (validationError) return next(new ErrorHandler(validationError, 422));

    const modelRecommendations = await requestRecommendations({
        age: Number(age),
        height: Number(height),
        weight: Number(weight),
        gender: Number(gender),
        diseases,
    });

    const names = [...new Set(modelRecommendations.map(({ name }) => normalizeFoodName(name)))].slice(0, MAX_RECOMMENDATIONS);
    const recommendationWords = [...new Set(names.flatMap(tokenizeFoodName))];
    const products = recommendationWords.length
        ? await Product.find({
            $or: recommendationWords.map((word) => ({ name: new RegExp("\\b" + escapeRegex(word) + "\\b", "i") })),
        }).select("_id name").lean()
        : [];

    const recommendations = modelRecommendations
        .filter(({ name }, index, all) => {
            const normalizedName = normalizeFoodName(name);
            return names.includes(normalizedName)
                && all.findIndex((item) => normalizeFoodName(item.name) === normalizedName) === index;
        })
        .map(({ name, reason }) => {
            const product = findBestProduct(name, products);
            return {
                name,
                reason,
                product: product
                    ? { id: product._id.toString(), name: product.name, href: "/product/" + product._id }
                    : null,
            };
        });

    res.status(200).json({ success: true, recommendations });
});
