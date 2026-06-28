# wframe

ePaper dashboard for ESPHome boards. Pick a dashboard in the web UI, the backend renders a 1-bit BMP, the ESP fetches it from a per-user URL.

## Quick start

```bash
docker compose up -d postgres

cd services/backend
cp .env.example .env
uv sync
uv run playwright install chromium
uv run uvicorn app.main:app --reload --port 8000

cd ../frontend
cp .env.example .env
pnpm install
pnpm dev
```

Open <http://localhost:5173>, sign in with any token, pick a dashboard, copy the `bitmap_url`, paste into your ESPHome `epaper.yaml` as `streaming_bmp.url`.
