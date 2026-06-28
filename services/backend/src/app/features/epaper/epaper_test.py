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


async def test_list_auto_provisions_first_epaper(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep1@example.com")
    service = _epaper_service(db_session)

    epapers = await service.list_for_user(user.id)

    assert len(epapers) == 1
    only = epapers[0]
    assert only.dashboard_id is None
    assert only.dashboard is None
    assert only.name
    assert only.slug
    assert only.bitmap_url.endswith(f"/e/{only.slug}.bmp")


async def test_create_additional_epaper_with_unique_slug(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep_multi@example.com")
    service = _epaper_service(db_session)

    first = (await service.list_for_user(user.id))[0]
    second = await service.create(user.id, "Kitchen")

    assert second.name == "Kitchen"
    assert second.slug != first.slug
    listed = await service.list_for_user(user.id)
    assert {e.id for e in listed} == {first.id, second.id}


async def test_rename_epaper(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep_rename@example.com")
    service = _epaper_service(db_session)
    ep = (await service.list_for_user(user.id))[0]

    renamed = await service.rename(user.id, ep.id, "Office")

    assert renamed.name == "Office"


async def test_delete_epaper(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep_delete@example.com")
    service = _epaper_service(db_session)
    extra = await service.create(user.id, "Spare")

    await service.delete(user.id, extra.id)

    listed = await service.list_for_user(user.id)
    assert extra.id not in {e.id for e in listed}


async def test_deploy_dashboard_by_id(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep2@example.com")
    dashboards = DashboardService(DashboardRepo(db_session))
    created = await dashboards.add_from_store(user.id, DashboardType.WEATHER)
    service = EpaperService(EpaperRepo(db_session), dashboards)
    ep = (await service.list_for_user(user.id))[0]

    epaper = await service.set_dashboard(user.id, ep.id, created.id)

    assert epaper.dashboard_id == created.id
    assert epaper.dashboard is not None
    assert epaper.dashboard.type == DashboardType.WEATHER


async def test_deploy_clearing_sets_null(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "ep3@example.com")
    dashboards = DashboardService(DashboardRepo(db_session))
    created = await dashboards.add_from_store(user.id, DashboardType.LIFE)
    service = EpaperService(EpaperRepo(db_session), dashboards)
    ep = (await service.list_for_user(user.id))[0]

    _ = await service.set_dashboard(user.id, ep.id, created.id)
    cleared = await service.set_dashboard(user.id, ep.id, None)

    assert cleared.dashboard_id is None
    assert cleared.dashboard is None


async def test_cannot_deploy_other_users_dashboard(db_session: AsyncSession) -> None:
    owner = await _make_user(db_session, "ep4owner@example.com")
    other = await _make_user(db_session, "ep4other@example.com")
    dashboards = DashboardService(DashboardRepo(db_session))
    created = await dashboards.add_from_store(owner.id, DashboardType.GITHUB)
    service = EpaperService(EpaperRepo(db_session), dashboards)
    other_ep = (await service.list_for_user(other.id))[0]

    with pytest.raises(HTTPException) as exc:
        _ = await service.set_dashboard(other.id, other_ep.id, created.id)
    assert exc.value.status_code == 404


async def test_cannot_touch_other_users_epaper(db_session: AsyncSession) -> None:
    owner = await _make_user(db_session, "ep5owner@example.com")
    other = await _make_user(db_session, "ep5other@example.com")
    service = _epaper_service(db_session)
    owner_ep = (await service.list_for_user(owner.id))[0]

    with pytest.raises(HTTPException) as exc:
        _ = await service.rename(other.id, owner_ep.id, "Hijacked")
    assert exc.value.status_code == 404
