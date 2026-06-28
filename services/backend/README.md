# wframe backend

FastAPI + async SQLAlchemy + Postgres. Vertical slices per domain.

## Run

```bash
cp .env.example .env
uv sync
uv run playwright install chromium
uv run uvicorn app.main:app --reload --port 8000
```
