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
cd services/recommendation
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Run these commands from the repository root. Set `GEMINI_API_KEY` in this
service's `.env`, and use the same `RECOMMENDATION_SERVICE_SECRET` in
`backend/.env` and `services/recommendation/.env`. The backend's local URL is
`http://127.0.0.1:5000`.

```bash
uvicorn server:app --host 0.0.0.0 --port 5000
```

## Docker Compose

The Compose service is named `recommendation_service` and listens on port
`5000` inside the Docker network. It is intentionally not published to the
host; the backend reaches it at:

```text
http://recommendation_service:5000
```

From the repository root, create the environment files and start the stack:

```bash
make init-env
make up-d
make recommendation-logs
```

Compose reads this service's environment from
`services/recommendation/.env`. Keep `GEMINI_API_KEY` there; configure
`GEMINI_BASE_URL` and `GEMINI_MODEL` if using another compatible endpoint or
model.

The default model is `gemma-4b-it` as requested. If Gemini returns a
model-not-found error, list the models available to the API key and set
`GEMINI_MODEL` to the exact returned ID:

```bash
curl https://generativelanguage.googleapis.com/v1beta/openai/models \
  -H "Authorization: Bearer $GEMINI_API_KEY"
```

The LangGraph workflow currently has one provider node. That node uses
LangChain's `ChatOpenAI.with_structured_output` with the Gemini-compatible base
URL and the Pydantic response model. Keeping the provider call in a graph makes
retries, validation, fallback nodes, and observability explicit extensions
rather than mixing them into the HTTP handler.

## API

`POST /recommend` requires the `X-Recommendation-Secret` header. `GET /health`
reports the configured provider and model.

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

## Tests

From the repository root, after installing the Python dependencies in this
service's virtual environment:

```bash
cd services/recommendation
.venv/bin/python -m unittest discover -s tests -v
```
