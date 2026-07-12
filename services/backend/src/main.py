from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from app.auth.auth_router import router as auth_router
from app.database.status import DBPoolStatus, get_db_pool_status_value
from app.database.test_connection import test_db_connection
from app.features.bitmap.bitmap_router import router as bitmap_router
from app.features.bitmap.github_router import router as github_router
from app.features.bitmap.ha_router import router as ha_router
from app.features.bitmap.image_router import router as image_router
from app.features.bitmap.location_router import router as location_router
from app.features.bitmap.vag_router import router as vag_router
from app.features.dashboard.dashboard_router import router as dashboard_router
from app.features.epaper.epaper_router import router as epaper_router
from app.features.user.user_router import router as user_router
from app.logging import create_logger, setup_logging
from app.server.server_info import get_server_info
from app.settings import settings
from app.tasks.example_task import cancel_example_task, start_example_task

setup_logging()
logger = create_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info(f"🚀 Starting '{settings.APP_NAME}' in Environment: {settings.ENVIRONMENT}")

    await test_db_connection()

    example_task = start_example_task()

    yield

    # Graceful shutdown. Do any cleanups here.
    await cancel_example_task(task=example_task)

    logger.info("🛑 Shutting down now")


_is_prod = settings.ENVIRONMENT == "PROD"

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    description="wframe backend",
    version="1.0.0",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+" if settings.ENVIRONMENT == "LOCAL" else None,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Rate Limiting
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # pyright: ignore[reportArgumentType]
app.add_middleware(SlowAPIMiddleware)


# Routes
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(dashboard_router)
app.include_router(epaper_router)
app.include_router(bitmap_router)
app.include_router(location_router)
app.include_router(github_router)
app.include_router(ha_router)
app.include_router(image_router)
app.include_router(vag_router)


@app.get("/")
@limiter.limit("10/minute")  # pyright: ignore[reportUnknownMemberType, reportUntypedFunctionDecorator]
async def root(request: Request):  # pyright: ignore[reportUnusedParameter] needed for slowapi
    raise HTTPException(status_code=404)


@app.get("/health")
@limiter.limit("5/minute")  # pyright: ignore[reportUnknownMemberType, reportUntypedFunctionDecorator]
async def server_info(request: Request):  # pyright: ignore[reportUnusedParameter] needed for slowapi
    return get_server_info()


@app.get("/db-stats", response_model=DBPoolStatus)
@limiter.limit("2/minute")  # pyright: ignore[reportUnknownMemberType, reportUntypedFunctionDecorator]
async def get_db_pool_status(request: Request) -> DBPoolStatus:  # pyright: ignore[reportUnusedParameter] needed for slowapi
    """Returns current SQLAlchemy async connection pool statistics."""
    return get_db_pool_status_value()


@app.get("/info")
async def info():
    return JSONResponse(status_code=200, content={"detail": "ok"})
