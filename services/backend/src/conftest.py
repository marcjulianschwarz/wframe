from collections.abc import AsyncGenerator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import engine


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an AsyncSession bound to a transaction that is rolled back.

    Each test runs inside a transaction that is never committed, so changes are
    isolated and the database is left untouched between tests.
    """
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(bind=connection, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()
