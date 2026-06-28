.PHONY: help dev install clean migrate-create migrate-up migrate-down test lint format ready

help:
	@echo "Available commands:"
	@echo "  make dev                - Start development server (uvicorn with reload)"
	@echo "  make install            - Install dependencies + playwright chromium"
	@echo "  make clean              - Remove cache files"
	@echo "  make migrate-create     - Create new migration (requires MSG variable)"
	@echo "  make migrate-up         - Apply all pending migrations"
	@echo "  make migrate-down       - Rollback last migration"
	@echo "  make test               - Run tests"
	@echo "  make lint               - Run ruff lint, format check and basedpyright"
	@echo "  make format             - Format code with ruff"
	@echo "  make ready              - Run lint then tests"

install:
	uv sync
	uv run playwright install chromium

dev:
	uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 --app-dir src

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type f -name ".coverage" -delete

# Alembic database migration commands
migrate-create:
	@if [ -z "$(MSG)" ]; then \
		echo "Error: MSG variable is required. Usage: make migrate-create MSG='your message'"; \
		exit 1; \
	fi
	uv run alembic revision --autogenerate -m "$(MSG)"

migrate-up:
	uv run alembic upgrade head

migrate-down:
	uv run alembic downgrade -1

test:
	uv run pytest

lint:
	@echo "==> Ruff lint"
	uv run ruff check src
	@echo "==> Ruff format check"
	uv run ruff format --check src
	@echo "==> Basedpyright type check"
	uv run basedpyright src

ready:
	@echo "=====> Linting"
	$(MAKE) lint
	@echo "=====> Testing"
	$(MAKE) test

format:
	uv run ruff format src
