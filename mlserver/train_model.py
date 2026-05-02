"""
NutriNavigator — Model Training Script
=======================================
Generates synthetic training data, trains a RandomForest classifier,
and saves the model to models/model_pickle.

Run once before starting the server:
    python train_model.py

Optional flags:
    --estimators  N    number of trees (default: 100)
    --test-size   F    test split fraction (default: 0.30)
    --seed        N    random seed (default: 42)
"""

import argparse
import logging
import pickle
import random
from pathlib import Path

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn import preprocessing

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR / "datasets"
MODELS_DIR   = BASE_DIR / "models"

# ─── Food lists per condition ─────────────────────────────────────────────────
ALL_FOODS = sorted([
    "Apple (আপেল)", "Banana (কলা)", "Bean  (সিম)", "Bitter Gourd (করলা)",
    "Blood Orange (মাল্টা)", "Bottle Gourd Leaf (লাউ শাক)", "Bottle Groud (লাউ)",
    "Brinjal (বেগুন)", "Cabbage (বাধাঁকপি)", "Capsicum (মিষ্টি মরিচ)",
    "Carrot (গাজর)", "Cauliflower (ফুলকপি)", "Cucumber (শসা)", "Dates (খেজুর)",
    "Dragon Fruit (ড্রাগন ফলের)", "Ginger (আদা)", "Gooseberry (আমলকী)",
    "Green Chilli (কাঁচা মরিচ)", "Green Grapes (আঙ্গুর)", "Green Papaya (কাঁচা পেঁপে)",
    "Green Peas (মটরশুঁটি)", "Guava(পেয়ারা)", "Java Apple (জামরুল)", "Lemon (লেবু)",
    "Long Bean (বরবটি)", "Malabar Spinach (পুঁই শাক)", "Okra (ঢেঁড়স)",
    "Orange (কমলা)", "Pointed Gourd (পটল)", "Pomegranate (বেদানা)",
    "Pumpkin Spinach (কুমড়ো শাক)", "Radish (মুলা)", "Red Spinach (লালশাক)",
    "Ripe Papaya (পাকা পেঁপে)", "Spinach (পালং শাক)", "Sweet Potato  (মিষ্টি আলু)",
    "Sweet Pumpkin (মিষ্টি কুমড়া)", "Taro (কচু শাক)", "Tomato (টমেটো)",
    "Turnip (শালগম)", "Water Melon (তরমুজ)", "White Pear (নাশপাতি)",
])

# Disease code → recommended foods
# Codes match the frontend: 1=HBP, 2=LBP, 3=Anaemia, 4=Allergies,
#                           5=Cholesterol, 6=Asthma, 7=Diabetes
FOODS_BY_CONDITION: dict[int, list[str]] = {
    0: ALL_FOODS,  # no condition
    1: sorted([  # High blood pressure
        "Spinach (পালং শাক)", "Cauliflower (ফুলকপি)", "Cucumber (শসা)",
        "Bottle Groud (লাউ)", "Cabbage (বাধাঁকপি)", "Tomato (টমেটো)",
        "Sweet Pumpkin (মিষ্টি কুমড়া)", "Brinjal (বেগুন)", "Banana (কলা)",
        "Gooseberry (আমলকী)", "Ripe Papaya (পাকা পেঁপে)", "Green Papaya (কাঁচা পেঁপে)",
        "Guava(পেয়ারা)", "Pomegranate (বেদানা)",
    ]),
    2: sorted([  # Low blood pressure
        "Red Spinach (লালশাক)", "Taro (কচু শাক)", "Green Grapes (আঙ্গুর)",
        "Orange (কমলা)", "Blood Orange (মাল্টা)",
    ]),
    3: sorted([  # Anaemia
        "Long Bean (বরবটি)", "Bean  (সিম)", "Red Spinach (লালশাক)",
        "Spinach (পালং শাক)", "Taro (কচু শাক)", "Apple (আপেল)",
        "Guava(পেয়ারা)", "Banana (কলা)", "Dates (খেজুর)", "Dragon Fruit (ড্রাগন ফলের)",
    ]),
    4: sorted([  # Allergies
        "Banana (কলা)", "Orange (কমলা)", "Green Chilli (কাঁচা মরিচ)", "Lemon (লেবু)",
        "Cucumber (শসা)", "Carrot (গাজর)", "Ginger (আদা)", "Cabbage (বাধাঁকপি)",
        "Cauliflower (ফুলকপি)",
    ]),
    5: sorted([  # Cholesterol
        "Spinach (পালং শাক)", "Malabar Spinach (পুঁই শাক)", "Water Melon (তরমুজ)",
        "Apple (আপেল)", "Banana (কলা)", "Taro (কচু শাক)", "Ripe Papaya (পাকা পেঁপে)",
        "Guava(পেয়ারা)",
    ]),
    6: sorted([  # Asthma
        "Carrot (গাজর)", "Sweet Potato  (মিষ্টি আলু)", "Bottle Gourd Leaf (লাউ শাক)",
        "Spinach (পালং শাক)", "Pumpkin Spinach (কুমড়ো শাক)", "Apple (আপেল)",
        "Banana (কলা)", "Orange (কমলা)", "Lemon (লেবু)", "Ginger (আদা)",
    ]),
    7: sorted([  # Diabetes
        "Apple (আপেল)", "Banana (কলা)", "Bean  (সিম)", "Bitter Gourd (করলা)",
        "Brinjal (বেগুন)", "Bottle Groud (লাউ)", "Cabbage (বাধাঁকপি)",
        "Capsicum (মিষ্টি মরিচ)", "Carrot (গাজর)", "Cauliflower (ফুলকপি)",
        "Cucumber (শসা)", "Dates (খেজুর)", "Green Papaya (কাঁচা পেঁপে)",
        "Green Peas (মটরশুঁটি)", "Guava(পেয়ারা)", "Java Apple (জামরুল)", "Lemon (লেবু)",
        "Long Bean (বরবটি)", "Okra (ঢেঁড়স)", "Pointed Gourd (পটল)", "Radish (মুলা)",
        "Sweet Pumpkin (মিষ্টি কুমড়া)", "Tomato (টমেটো)", "Turnip (শালগম)",
        "Water Melon (তরমুজ)", "White Pear (নাশপাতি)",
    ]),
}


# ─── Data generation ──────────────────────────────────────────────────────────
def _generate_condition_df(
    disease_code: int,
    food_list: list[str],
    n: int,
    rng: np.random.Generator,
    smote: SMOTE,
) -> pd.DataFrame:
    ages    = rng.integers(18, 61, size=n)
    genders = rng.integers(0, 2, size=n)
    heights = np.round(rng.uniform(1.5, 2.0, size=n), 2)
    weights = np.round(rng.uniform(40.0, 100.0, size=n), 2)
    bmis    = np.round(weights / heights ** 2, 4)
    labels  = random.choices(food_list, k=n)

    df = pd.DataFrame({
        "age":              ages,
        "bmi":              bmis,
        "gender":           genders,
        "dieseas":          np.full(n, disease_code, dtype=int),
        "recommended_food": labels,
    })

    X_res, y_res = smote.fit_resample(
        df.drop(columns="recommended_food"),
        df["recommended_food"],
    )
    return pd.concat([X_res, y_res], axis=1)


def build_dataset(n_per_condition: int, seed: int) -> pd.DataFrame:
    rng   = np.random.default_rng(seed)
    random.seed(seed)
    smote = SMOTE(random_state=seed, k_neighbors=2)

    frames = [
        _generate_condition_df(code, foods, n_per_condition, rng, smote)
        for code, foods in FOODS_BY_CONDITION.items()
    ]
    df = pd.concat(frames, ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    logger.info("Dataset shape: %s", df.shape)
    return df


# ─── Training ────────────────────────────────────────────────────────────────
def train(args: argparse.Namespace) -> None:
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Build & encode dataset
    df = build_dataset(n_per_condition=1000, seed=args.seed)

    encoder = preprocessing.LabelEncoder()
    df["food_recommended"] = encoder.fit_transform(df["recommended_food"])

    label_mapping = dict(sorted(
        zip(df["food_recommended"], df["recommended_food"]),
        key=lambda x: x[0],
    ))
    logger.info("Label mapping: %s", label_mapping)

    df.drop(columns="recommended_food", inplace=True)

    # Save raw dataset
    raw_path = DATASETS_DIR / "food_recommendation.csv"
    df.to_csv(raw_path, index=False)
    logger.info("Saved raw dataset → %s", raw_path)

    # Balance with SMOTE
    X = df.drop(columns="food_recommended")
    y = df["food_recommended"]
    smote = SMOTE(random_state=args.seed, k_neighbors=2)
    X_bal, y_bal = smote.fit_resample(X, y)
    df_bal = pd.concat([X_bal, y_bal], axis=1)

    bal_path = DATASETS_DIR / "food_recommendation_balanced.csv"
    df_bal.to_csv(bal_path, index=False)
    logger.info("Saved balanced dataset → %s", bal_path)

    # Train / test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_bal, y_bal,
        test_size=args.test_size,
        stratify=y_bal,
        random_state=args.seed,
    )
    logger.info(
        "Split — train: %s  test: %s", X_train.shape, X_test.shape
    )

    # Fit model
    logger.info("Training RandomForestClassifier (n_estimators=%d)…", args.estimators)
    model = RandomForestClassifier(n_estimators=args.estimators, random_state=args.seed)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    logger.info("Test accuracy: %.4f", acc)
    logger.info("Classification report:\n%s", classification_report(y_test, y_pred))

    # Retrain on full balanced dataset for production pickle
    logger.info("Retraining on full balanced dataset for production…")
    model.fit(X_bal, y_bal)

    # Save model
    model_path = MODELS_DIR / "model_pickle"
    with model_path.open("wb") as f:
        pickle.dump(model, f)
    logger.info("Model saved → %s", model_path)


# ─── CLI ─────────────────────────────────────────────────────────────────────
def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train NutriNavigator food-recommendation model")
    parser.add_argument("--estimators", type=int, default=100, help="Number of RF trees (default: 100)")
    parser.add_argument("--test-size",  type=float, default=0.30, help="Test split fraction (default: 0.30)")
    parser.add_argument("--seed",       type=int, default=42, help="Random seed (default: 42)")
    return parser.parse_args()


if __name__ == "__main__":
    train(_parse_args())
