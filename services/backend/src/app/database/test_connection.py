from sqlalchemy import text

from app.database.session import engine
from app.logging import create_logger
from app.settings import settings

logger = create_logger("TestDBConnection")


async def test_db_connection() -> None:
    """Try a single SQL query to verify the database connection.

    RAISES an exception when the database connection failed.
    """

    try:
        async with engine.connect() as conn:
            _ = await conn.execute(text("SELECT 1"))
        logger.info(
            "✅ Database connected",
            extra={"db_connection": f"{settings.DB_HOST}/{settings.DB_NAME}"},
        )
    except Exception as e:
        logger.error(
            "❌ Database connection failed",
            extra={"db_connection": f"{settings.DB_HOST}/{settings.DB_NAME}", "error": e},
        )
        raise
