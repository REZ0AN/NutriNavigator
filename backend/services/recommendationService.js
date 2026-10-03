import axios from "axios";
import ErrorHandler from "../utils/errorHandler.js";

const MAX_RECOMMENDATIONS = 8;

export const requestRecommendations = async (profile) => {
    const serviceUrl = process.env.RECOMMENDATION_SERVICE_URL || "http://127.0.0.1:5000";
    const serviceSecret = process.env.RECOMMENDATION_SERVICE_SECRET;
    if (!serviceSecret) {
        throw new ErrorHandler("Recommendation service is not configured.", 503);
    }

    try {
        const { data } = await axios.post(
            serviceUrl.replace(/\/$/, "") + "/recommend",
            profile,
            {
                timeout: 15000,
                headers: {
                    "Content-Type": "application/json",
                    "X-Recommendation-Secret": serviceSecret,
                },
            },
        );
        if (!Array.isArray(data?.recommendations)) {
            throw new Error("Invalid recommendation response.");
        }
        return data.recommendations
            .filter((item) => typeof item?.name === "string" && item.name.trim())
            .slice(0, MAX_RECOMMENDATIONS)
            .map((item) => ({
                name: item.name.trim(),
                reason: typeof item.reason === "string" ? item.reason.trim() : "",
            }));
    } catch (error) {
        if (error instanceof ErrorHandler) throw error;
        throw new ErrorHandler("Recommendation service is temporarily unavailable.", 503);
    }
};
