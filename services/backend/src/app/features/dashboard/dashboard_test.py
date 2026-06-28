import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.dashboard.dashboard_models import DashboardSource, DashboardType
from app.features.dashboard.dashboard_repository import DashboardRepo
from app.features.dashboard.dashboard_schemas import (
    CustomDashboardCreate,
    DashboardUpdate,
)
from app.features.dashboard.dashboard_service import DashboardService, slugify
from app.features.user.user_models import User


async def _make_user(session: AsyncSession, email: str) -> User:
    user = User(email=email, username=email.split("@")[0], hashed_password="!")
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


def _service(session: AsyncSession) -> DashboardService:
    return DashboardService(DashboardRepo(session))


# --- slugify ------------------------------------------------------------- #
def test_slugify_basic() -> None:
    assert slugify("My Weather Board") == "my-weather-board"
    assert slugify("  Hello!!  World  ") == "hello-world"
    assert slugify("***") == ""


# --- store catalog ------------------------------------------------------- #
async def test_list_store_covers_every_type(db_session: AsyncSession) -> None:
    service = _service(db_session)
    types = {item.type for item in service.list_store()}
    assert types == set(DashboardType)


# --- add from store ------------------------------------------------------ #
async def test_add_from_store_creates_row(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "store@example.com")
    service = _service(db_session)

    read = await service.add_from_store(user.id, DashboardType.WEATHER)

    assert read.source == DashboardSource.STORE
    assert read.type == DashboardType.WEATHER
    assert read.custom_url is None
    assert read.name == "Weather"
    assert read.slug == "weather"
    assert read.preview_url.endswith("/bitmaps/weather/preview")


async def test_add_same_store_twice_dedupes_slug(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "dup@example.com")
    service = _service(db_session)

    first = await service.add_from_store(user.id, DashboardType.WEATHER)
    second = await service.add_from_store(user.id, DashboardType.WEATHER)

    assert first.slug == "weather"
    assert second.slug == "weather-2"


# --- custom create ------------------------------------------------------- #
async def test_create_custom_auto_slug(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "custom@example.com")
    service = _service(db_session)

    read = await service.create_custom(
        user.id,
        CustomDashboardCreate(name="My Page", description=" hi ", custom_url="https://example.com"),
    )

    assert read.source == DashboardSource.CUSTOM
    assert read.type is None
    assert read.custom_url == "https://example.com"
    assert read.slug == "my-page"
    assert read.description == "hi"
    # Custom rows reuse the custom-URL placeholder preview.
    assert read.preview_url.endswith("/bitmaps/custom_url/preview")


async def test_create_custom_explicit_slug(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "slug@example.com")
    service = _service(db_session)

    read = await service.create_custom(
        user.id,
        CustomDashboardCreate(name="My Page", slug="Custom Slug!", custom_url="https://example.com"),
    )

    assert read.slug == "custom-slug"


async def test_create_custom_rejects_bad_url(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "badurl@example.com")
    service = _service(db_session)

    with pytest.raises(HTTPException) as exc:
        _ = await service.create_custom(user.id, CustomDashboardCreate(name="X", custom_url="ftp://nope"))
    assert exc.value.status_code == 400


async def test_explicit_slug_conflict_raises_409(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "conflict@example.com")
    service = _service(db_session)

    _ = await service.create_custom(user.id, CustomDashboardCreate(name="A", slug="taken", custom_url="https://a.com"))
    with pytest.raises(HTTPException) as exc:
        _ = await service.create_custom(
            user.id, CustomDashboardCreate(name="B", slug="taken", custom_url="https://b.com")
        )
    assert exc.value.status_code == 409


# --- filter, update, delete --------------------------------------------- #
async def test_list_filter_by_source(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "filter@example.com")
    service = _service(db_session)
    _ = await service.add_from_store(user.id, DashboardType.LIFE)
    _ = await service.create_custom(user.id, CustomDashboardCreate(name="C", custom_url="https://c.com"))

    store_only = await service.list_collection(user.id, DashboardSource.STORE)
    custom_only = await service.list_collection(user.id, DashboardSource.CUSTOM)

    assert [d.type for d in store_only] == [DashboardType.LIFE]
    assert [d.source for d in custom_only] == [DashboardSource.CUSTOM]
    assert len(await service.list_collection(user.id)) == 2


async def test_update_custom_fields(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "edit@example.com")
    service = _service(db_session)
    created = await service.create_custom(user.id, CustomDashboardCreate(name="Old", custom_url="https://old.com"))

    updated = await service.update(
        user.id,
        created.id,
        DashboardUpdate(name="New", slug="fresh", custom_url="https://new.com"),
    )

    assert updated.name == "New"
    assert updated.slug == "fresh"
    assert updated.custom_url == "https://new.com"


async def test_update_url_on_store_dashboard_rejected(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "storeedit@example.com")
    service = _service(db_session)
    created = await service.add_from_store(user.id, DashboardType.GITHUB)

    with pytest.raises(HTTPException) as exc:
        _ = await service.update(user.id, created.id, DashboardUpdate(custom_url="https://x.com"))
    assert exc.value.status_code == 400


async def test_delete_dashboard(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "del@example.com")
    service = _service(db_session)
    created = await service.add_from_store(user.id, DashboardType.HN_ZEITUNG)

    await service.delete(user.id, created.id)

    assert await service.list_collection(user.id) == []


# --- ownership ----------------------------------------------------------- #
async def test_cannot_touch_another_users_dashboard(db_session: AsyncSession) -> None:
    owner = await _make_user(db_session, "owner@example.com")
    other = await _make_user(db_session, "other@example.com")
    service = _service(db_session)
    created = await service.add_from_store(owner.id, DashboardType.DASHBOARD)

    for action in (
        lambda: service.get_owned(other.id, created.id),
        lambda: service.update(other.id, created.id, DashboardUpdate(name="hax")),
        lambda: service.delete(other.id, created.id),
    ):
        with pytest.raises(HTTPException) as exc:
            _ = await action()
        assert exc.value.status_code == 404


async def test_get_owned_missing_raises_404(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "missing@example.com")
    service = _service(db_session)
    with pytest.raises(HTTPException) as exc:
        _ = await service.get_owned(user.id, uuid.uuid4())
    assert exc.value.status_code == 404
