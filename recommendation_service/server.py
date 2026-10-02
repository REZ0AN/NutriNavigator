import hmac
import json
import logging
import os
from typing import Annotated, TypedDict

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, status
from langgraph.graph import END, StateGraph
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, field_validator

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
)
logger = logging.getLogger(__name__)

PORT = int(os.getenv("PORT", "5000"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_BASE_URL = os.getenv(
    "GEMINI_BASE_URL",
    "https://generativelanguage.googleapis.com/v1beta/openai/",
)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemma-4b-it")
SERVICE_SECRET = os.getenv("RECOMMENDATION_SERVICE_SECRET", "")
MAX_RECOMMENDATIONS = 8

app = FastAPI(title="NutriNavigator Recommendation Service", version="1.0.0")


class FoodRecommendation(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    reason: str = Field(min_length=1, max_length=240)


class RecommendationResponse(BaseModel):
    recommendations: list[FoodRecommendation] = Field(
        min_length=1,
        max_length=MAX_RECOMMENDATIONS,
    )


class ProfileRequest(BaseModel):
    age: float = Field(ge=1, le=120)
    height: float = Field(ge=0.5, le=3)
    weight: float = Field(ge=10, le=300)
    gender: int = Field(ge=0, le=1)
    diseases: list[int] = Field(max_length=10)

    @field_validator("diseases")
    @classmethod
    def validate_disease_codes(cls, values: list[int]) -> list[int]:
        if any(isinstance(code, bool) or not 0 <= code <= 7 for code in values):
            raise ValueError("diseases must contain integer codes from 0 through 7.")
        return values


SYSTEM_PROMPT = """You are a nutrition recommendation assistant for an e-commerce demo.
Suggest common foods that may fit the user's profile and selected health conditions.

The user's disease_codes use this exact mapping:
0 = no condition selected
1 = High Blood Pressure
2 = Low Blood Pressure
3 = Anaemia
4 = Allergies
5 = Cholesterol
6 = Asthma
7 = Diabetes

Interpret every code using this mapping. Do not treat the numeric codes as food
names, diagnoses, or severity scores.

Do not diagnose, prescribe treatment, or claim that food replaces medical care.
Use plain food names without brand names, quantities, or links.
Return at most eight diverse suggestions and never include duplicates.
Return only a JSON object with this exact shape:
{"recommendations":[{"name":"food name","reason":"short reason"}]}
Do not use Markdown fences or add text before or after the JSON object."""


class RecommendationState(TypedDict, total=False):
    profile: ProfileRequest
    recommendations: RecommendationResponse


def _is_authorized(incoming_secret: str | None) -> bool:
    if not SERVICE_SECRET:
        logger.error("RECOMMENDATION_SERVICE_SECRET is not configured")
        return False
    return bool(incoming_secret) and hmac.compare_digest(incoming_secret, SERVICE_SECRET)


def _build_structured_model():
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    model = ChatOpenAI(
        api_key=GEMINI_API_KEY,
        base_url=GEMINI_BASE_URL,
        model=GEMINI_MODEL,
        temperature=0,
    )
    return model.with_structured_output(RecommendationResponse, method="json_mode")


def _recommend_node(state: RecommendationState) -> RecommendationState:
    profile = state["profile"]
    structured_model = _build_structured_model()
    parsed = structured_model.invoke([
        ("system", SYSTEM_PROMPT),
        (
            "human",
            json.dumps({
                "age": profile.age,
                "height_metres": profile.height,
                "weight_kg": profile.weight,
                "gender": profile.gender,
                "disease_codes": profile.diseases,
            }),
        ),
    ])
    if not isinstance(parsed, RecommendationResponse):
        parsed = RecommendationResponse.model_validate(parsed)
    return {"recommendations": parsed}


def _build_recommendation_graph():
    graph = StateGraph(RecommendationState)
    graph.add_node("recommend", _recommend_node)
    graph.set_entry_point("recommend")
    graph.add_edge("recommend", END)
    return graph.compile()


recommendation_graph = _build_recommendation_graph()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "provider": "gemini", "model": GEMINI_MODEL}


@app.post("/recommend", response_model=RecommendationResponse)
def recommend(
    profile: ProfileRequest,
    recommendation_secret: Annotated[str | None, Header(alias="X-Recommendation-Secret")] = None,
) -> RecommendationResponse:
    if not _is_authorized(recommendation_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized recommendation service request.",
        )

    try:
        result = recommendation_graph.invoke({"profile": profile})
        return result["recommendations"]
    except Exception:
        logger.exception("Recommendation provider failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recommendation service is temporarily unavailable.",
        ) from None


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=PORT,
        reload=os.getenv("APP_ENV") == "development",
    )
