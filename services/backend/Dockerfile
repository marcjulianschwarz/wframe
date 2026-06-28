# Playwright base image ships chromium + system deps for headless rendering.
# Keep this version in lockstep with the `playwright` package in uv.lock.
FROM mcr.microsoft.com/playwright/python:v1.60.0-noble

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set working directory
WORKDIR /app

# Copy uv configuration files
COPY pyproject.toml uv.lock* ./

# Install dependencies (production only — exclude dev tools like ruff/basedpyright)
RUN uv sync --frozen --no-cache --no-dev

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations, then start the application using uv (app code lives under src/)
CMD ["sh", "-c", "uv run --no-dev alembic upgrade head && uv run --no-dev uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir src"]
