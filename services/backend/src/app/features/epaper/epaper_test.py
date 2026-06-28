import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.dashboard.dashboard_models import DashboardType
from app.features.dashboard.dashboard_repository import DashboardRepo
from app.features.dashboard.dashboard_service import DashboardService
from app.features.epaper.epaper_repository import EpaperRepo
from app.features.epaper.epaper_service import EpaperService
from app.features.user.user_models import User


async def _make_user(session: AsyncSession, email: str) -> User:
    user = User(email=email, username=email.split("@")[0], hashed_password="!")
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


def _epaper_service(session: AsyncSession) -> EpaperService:
    return EpaperService(EpaperRepo(session), DashboardService(DashboardRepo(session)))


async def test_get_or_create_starts_with_no_dashboard(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep1@example.com")
    service = _epaper_service(db_session)

    epaper = await service.get_or_create_for_user(user.id)

    assert epaper.dashboard_id is None
    assert epaper.dashboard is None
    assert epaper.slug
    assert epaper.bitmap_url.endswith(f"/e/{epaper.slug}.bmp")


async def test_deploy_dashboard_by_id(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep2@example.com")
    dashboards = DashboardService(DashboardRepo(db_session))
    created = await dashboards.add_from_store(user.id, DashboardType.WEATHER)
    service = EpaperService(EpaperRepo(db_session), dashboards)

    epaper = await service.set_dashboard(user.id, created.id)

    assert epaper.dashboard_id == created.id
    assert epaper.dashboard is not None
    assert epaper.dashboard.type == DashboardType.WEATHER


async def test_deploy_clearing_sets_null(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep3@example.com")
    dashboards = DashboardService(DashboardRepo(db_session))
    created = await dashboards.add_from_store(user.id, DashboardType.LIFE)
    service = EpaperService(EpaperRepo(db_session), dashboards)

    _ = await service.set_dashboard(user.id, created.id)
    cleared = await service.set_dashboard(user.id, None)

    assert cleared.dashboard_id is None
    assert cleared.dashboard is None


async def test_cannot_deploy_other_users_dashboard(db_session: AsyncSession) -> None:
    owner = await _make_user(db_session, "ep4owner@example.com")
    other = await _make_user(db_session, "ep4other@example.com")
    dashboards = DashboardService(DashboardRepo(db_session))
    created = await dashboards.add_from_store(owner.id, DashboardType.GITHUB)
    service = EpaperService(EpaperRepo(db_session), dashboards)

    with pytest.raises(HTTPException) as exc:
        _ = await service.set_dashboard(other.id, created.id)
    assert exc.value.status_code == 404
