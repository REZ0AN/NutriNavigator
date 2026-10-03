SHELL := /bin/sh

COMPOSE ?= docker compose
ENV_FILE ?= .env
COMPOSE_ENV = $(COMPOSE) --env-file $(ENV_FILE)
SERVICE_ENV_FILES = backend/.env frontend/.env services/recommendation/.env

.PHONY: help check-env config build up up-d detach down restart ps logs \
        backend-logs recommendation-logs frontend-logs \
        test test-backend test-integration test-recommendation test-frontend \
        frontend-build init-env clean

help:
	@echo "NutriNavigator commands:"
	@echo "  make up                  Build and start the full Compose stack"
	@echo "  make up-d                Build and start in detached mode"
	@echo "  make down                Stop the Compose containers"
	@echo "  make clean               Stop containers and remove Compose volumes"
	@echo "  make build               Build all Docker images"
	@echo "  make ps                  Show container status"
	@echo "  make logs                Follow logs from all services"
	@echo "  make config              Validate the Compose configuration"
	@echo "  make init-env            Create local env files from the examples"
	@echo "  make test                Run backend, recommendation, and frontend tests"
	@echo "  make test-integration    Run backend MongoDB integration tests"
	@echo ""
	@echo "Compose uses .env for port/origin interpolation and service-specific .env files for secrets."

check-env:
	@test -f "$(ENV_FILE)" || (echo "Missing $(ENV_FILE). Run: make init-env"; exit 1)
	@for file in $(SERVICE_ENV_FILES); do \
		test -f "$$file" || (echo "Missing $$file. Run: make init-env"; exit 1); \
	done

init-env:
	@test -f .env || cp .env.example .env
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env || cp frontend/.env.example frontend/.env
	@test -f services/recommendation/.env || cp services/recommendation/.env.example services/recommendation/.env
	@echo "Environment files are ready. Fill in secrets before starting services."

config: check-env
	@$(COMPOSE_ENV) config --quiet
	@echo "Compose configuration is valid."

build: check-env
	@$(COMPOSE_ENV) build

up: check-env
	@$(COMPOSE_ENV) up --build

up-d: check-env
	@$(COMPOSE_ENV) up --build -d

down: check-env
	@$(COMPOSE_ENV) down

restart: down up-d

ps: check-env
	@$(COMPOSE_ENV) ps

logs: check-env
	@$(COMPOSE_ENV) logs -f

backend-logs: check-env
	@$(COMPOSE_ENV) logs -f backend

recommendation-logs: check-env
	@$(COMPOSE_ENV) logs -f recommendation_service

frontend-logs: check-env
	@$(COMPOSE_ENV) logs -f frontend

test-backend:
	@$(MAKE) -C backend test

test-integration:
	@cd backend && RUN_DB_INTEGRATION=true npm run test:integration

test-recommendation:
	@cd services/recommendation && .venv/bin/python -m unittest discover -s tests -v

test-frontend:
	@cd frontend && npm test -- --watchAll=false

frontend-build:
	@cd frontend && npm run build

test: test-backend test-recommendation test-frontend

clean: check-env
	@$(COMPOSE_ENV) down -v
