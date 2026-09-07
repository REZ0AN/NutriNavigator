import hmac
import hashlib
import os
import logging
import pickle
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BASE_DIR       = Path(__file__).resolve().parent
MODEL_PATH     = BASE_DIR / "models" / "model_pickle"
PORT           = int(os.getenv("PORT", 5000))
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:4080")
ML_SECRET      = os.getenv("ML_SECRET", "")

FOOD_LABELS: dict[int, str] = {
    0:  "Apple (আপেল)",               1:  "Banana (কলা)",
    2:  "Bean  (সিম)",                3:  "Bitter Gourd (করলা)",
    4:  "Blood Orange (মাল্টা)",      5:  "Bottle Gourd Leaf (লাউ শাক)",
    6:  "Bottle Groud (লাউ)",         7:  "Brinjal (বেগুন)",
    8:  "Cabbage (বাধাঁকপি)",        9:  "Capsicum (মিষ্টি মরিচ)",
    10: "Carrot (গাজর)",              11: "Cauliflower (ফুলকপি)",
    12: "Cucumber (শসা)",             13: "Dates (খেজুর)",
    14: "Dragon Fruit (ড্রাগন ফলের)", 15: "Ginger (আদা)",
    16: "Gooseberry (আমলকী)",         17: "Green Chilli (কাঁচা মরিচ)",
    18: "Green Grapes (আঙ্গুর)",      19: "Green Papaya (কাঁচা পেঁপে)",
    20: "Green Peas (মটরশুঁটি)",      21: "Guava(পেয়ারা)",
    22: "Java Apple (জামরুল)",        23: "Lemon (লেবু)",
    24: "Long Bean (বরবটি)",          25: "Malabar Spinach (পুঁই শাক)",
    26: "Okra (ঢেঁড়স)",              27: "Orange (কমলা)",
    28: "Pointed Gourd (পটল)",        29: "Pomegranate (বেদানা)",
    30: "Pumpkin Spinach (কুমড়ো শাক)", 31: "Radish (মুলা)",
    32: "Red Spinach (লালশাক)",       33: "Ripe Papaya (পাকা পেঁপে)",
    34: "Spinach (পালং শাক)",         35: "Sweet Potato  (মিষ্টি আলু)",
    36: "Sweet Pumpkin (মিষ্টি কুমড়া)", 37: "Taro (কচু শাক)",
    38: "Tomato (টমেটো)",             39: "Turnip (শালগম)",
    40: "Water Melon (তরমুজ)",        41: "White Pear (নাশপাতি)",
}

VALID_DISEASE_CODES = set(range(8))
RECOMMENDATION_TOP_K = 5

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model not found at {MODEL_PATH}. "
        "Run 'python train_model.py' first to generate it."
    )

with MODEL_PATH.open("rb") as f:
    RFC_MODEL = pickle.load(f)

logger.info("Model loaded from %s", MODEL_PATH)

app = Flask(__name__)
CORS(app, origins=[ALLOWED_ORIGIN])


# ─── Auth check — timing-safe ─────────────────────────────────────────────────
def _check_secret() -> tuple[bool, str]:
    """
    Validate X-ML-Secret header using hmac.compare_digest.

    Why hmac.compare_digest instead of ==:
    - == short-circuits on first mismatch → response time leaks info
    - hmac.compare_digest always takes the same time regardless of match position
    - Prevents timing attacks where attacker guesses secret char by char

    If ML_SECRET is not set → skip auth (dev convenience, NOT safe for production).
    """
    if not ML_SECRET:
        logger.warning("ML_SECRET not set — skipping auth (unsafe for production)")
        return True, ""

    incoming = request.headers.get("X-ML-Secret", "")

    if not incoming:
        return False, "Missing X-ML-Secret header"

    # Both must be same type (str) and same length for compare_digest
    # If lengths differ it returns False immediately — that length leak is
    # acceptable since secret length is not sensitive info
    try:
        match = hmac.compare_digest(incoming, ML_SECRET)
    except TypeError:
        # compare_digest raises TypeError if inputs aren't both str or both bytes
        return False, "Invalid secret format"

    if not match:
        return False, "Invalid secret"

    return True, ""


# ─── Payload validation ───────────────────────────────────────────────────────
def _validate_payload(data: dict) -> tuple[bool, str]:
    required = {"age", "height", "weight", "gender", "diesease"}
    missing  = required - data.keys()
    if missing:
        return False, f"Missing fields: {sorted(missing)}"

    try:
        age    = float(data["age"])
        height = float(data["height"])
        weight = float(data["weight"])
        gender = int(data["gender"])
    except (TypeError, ValueError):
        return False, "age, height, weight must be numbers; gender must be 0 or 1"

    if not (1 <= age <= 120):
        return False, "age must be between 1 and 120"
    if not (0.5 <= height <= 5.0):
        return False, "height must be in metres (0.5 – 3.0)"
    if not (10 <= weight <= 300):
        return False, "weight must be in kg (10 – 300)"
    if gender not in (0, 1):
        return False, "gender must be 0 (female) or 1 (male)"

    disease_list = data.get("diesease", [])
    if not isinstance(disease_list, list):
        return False, "'diesease' must be a list"
    if len(disease_list) > 10:
        return False, "'diesease' list too long (max 10)"
    for code in disease_list:
        if code not in VALID_DISEASE_CODES:
            return False, f"Invalid disease code: {code}. Valid codes: 0–7"

    return True, ""


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": "loaded"})


@app.post("/recommend")
def food_recommend():
    # 1. Auth
    authed, auth_err = _check_secret()
    if not authed:
        logger.warning("Unauthorized /recommend request: %s", auth_err)
        return jsonify({"error": auth_err}), 401

    # 2. Parse
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    # 3. Validate
    valid, err = _validate_payload(data)
    if not valid:
        return jsonify({"error": err}), 422

    # 4. Inference
    age          = float(data["age"])
    height       = float(data["height"])
    weight       = float(data["weight"])
    gender       = int(data["gender"])
    disease_list = data["diesease"]
    bmi          = round(weight / height ** 2, 4)

    # Keep the strongest model score for a food across the selected
    # conditions. This deduplicates overlapping condition results without
    # inventing a new probability-combination rule.
    food_confidence: dict[str, float] = {}

    for code in disease_list:
        if code == 0:
            continue

        probabilities = RFC_MODEL.predict_proba([[age, bmi, gender, code]])[0]

        for class_id, probability in zip(RFC_MODEL.classes_, probabilities):
            food = FOOD_LABELS.get(int(class_id))
            if food and probability > 0.0:
                food_confidence[food] = max(
                    food_confidence.get(food, 0.0), float(probability)
                )

    ranked_recommendations = sorted(
        (
            {"food": food, "confidence": round(confidence, 4)}
            for food, confidence in food_confidence.items()
        ),
        key=lambda recommendation: (
            -recommendation["confidence"], recommendation["food"]
        ),
    )[:RECOMMENDATION_TOP_K]
    recommended = [item["food"] for item in ranked_recommendations]

    logger.info(
        "Recommendation — age=%.0f bmi=%.2f gender=%d diseases=%s → %d foods",
        age, bmi, gender, disease_list, len(recommended),
    )

    return jsonify({
        # Legacy field retained for the existing backend/frontend consumers.
        "recommended_foods": recommended,
        # Ranked results for clients that need model confidence values.
        "recommendations": ranked_recommendations,
    })


# ─── Error handlers ───────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(_):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(exc):
    logger.exception("Unhandled exception: %s", exc)
    return jsonify({"error": "Internal server error"}), 500


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    debug = os.getenv("FLASK_ENV", "production") == "development"
    logger.info("Starting NutriNavigator ML server on port %d (debug=%s)", PORT, debug)
    app.run(host="0.0.0.0", port=PORT, debug=debug)
