from typing import cast

from pydantic import BaseModel
from sqlalchemy import QueuePool


class DBPoolStatus(BaseModel):
    pool_size: int
    max_overflow: int
    checked_in: int
    checked_out: int
    overflow: int


def get_db_pool_status_value() -> "DBPoolStatus":
    from app.database.session import engine

    # The async engine wraps a sync engine; the connection pool lives there.
    pool = cast(QueuePool, engine.sync_engine.pool)
    return DBPoolStatus(
        pool_size=pool.size(),
        max_overflow=pool._max_overflow,  # pyright: ignore[reportPrivateUsage]
        checked_in=pool.checkedin(),
        checked_out=pool.checkedout(),
        overflow=pool.overflow(),
    )
