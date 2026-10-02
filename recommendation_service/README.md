# NutriNavigator Recommendation Service

This FastAPI service replaces the former random-forest mlserver. It accepts a
validated profile from the backend, calls Google's Gemini OpenAI-compatible
endpoint with a structured JSON schema, and returns a bounded list of food
names and reasons.

The service does not access MongoDB and never creates product links. The
backend owns catalog matching and adds a link only when a recommendation
matches a product name in the database.

## Setup

```bash
cd recommendation_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --host 0.0.0.0 --port 5000
```

Set the same RECOMMENDATION_SERVICE_SECRET in backend/.env and this service's
.env. Keep GEMINI_API_KEY only in this service environment. Configure
GEMINI_BASE_URL and GEMINI_MODEL when using a different compatible endpoint or
model.

The default model is `gemma-4b-it` as requested. If Gemini returns a
model-not-found error, list the models available to the API key and set
`GEMINI_MODEL` to the exact returned ID:

```bash
curl https://generativelanguage.googleapis.com/v1beta/openai/models \
  -H "Authorization: Bearer $GEMINI_API_KEY"
```

Use Uvicorn for deployment:

```bash
uvicorn server:app --host 0.0.0.0 --port 5000
```

The LangGraph workflow currently has one provider node. That node uses
LangChain's `ChatOpenAI.with_structured_output` with the Gemini-compatible base
URL and the Pydantic response model. Keeping the provider call in a graph makes
retries, validation, fallback nodes, and observability explicit extensions
rather than mixing them into the HTTP handler.

## API

POST /recommend requires the X-Recommendation-Secret header.

```json
{
  "age": 28,
  "height": 1.72,
  "weight": 68,
  "gender": 1,
  "diseases": [1, 7]
}
```

The response is catalog-agnostic:

```json
{
  "recommendations": [
    { "name": "Spinach", "reason": "Provides leafy-green nutrients." }
  ]
}
```
