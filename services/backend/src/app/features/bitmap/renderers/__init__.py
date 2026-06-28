import uuid
from typing import assert_never

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.bitmap.renderers.base import (
    HEIGHT,
    WIDTH,
    DashboardRenderer,
    Geometry,
    composite_onto_screen,
    html_to_bmp,
)
from app.features.bitmap.renderers.custom_url import CustomUrlRenderer
from app.features.bitmap.renderers.dashboard import DashboardRendererImpl
from app.features.bitmap.renderers.github import GithubRenderer
from app.features.bitmap.renderers.hn_zeitung import HnZeitungRenderer
from app.features.bitmap.renderers.life import LifeRenderer
from app.features.bitmap.renderers.weather import WeatherRenderer
from app.features.dashboard.dashboard_models import DashboardType

__all__ = [
    "DashboardRenderer",
    "Geometry",
    "composite_onto_screen",
    "html_to_bmp",
    "WIDTH",
    "HEIGHT",
    "CustomUrlRenderer",
    "DashboardRendererImpl",
    "HnZeitungRenderer",
    "LifeRenderer",
    "WeatherRenderer",
    "GithubRenderer",
    "renderer_factory",
]


def renderer_factory(
    dashboard_type: DashboardType,
    *,
    session: AsyncSession | None = None,
    user_id: uuid.UUID | None = None,
    custom_url: str | None = None,
) -> DashboardRenderer:
    if dashboard_type == DashboardType.DASHBOARD:
        return DashboardRendererImpl()
    if dashboard_type == DashboardType.HN_ZEITUNG:
        return HnZeitungRenderer()
    if dashboard_type == DashboardType.CUSTOM_URL:
        return CustomUrlRenderer(custom_url)
    if dashboard_type in (DashboardType.LIFE, DashboardType.WEATHER, DashboardType.GITHUB):
        if session is None or user_id is None:
            raise ValueError(f"{dashboard_type} requires session and user_id")
        if dashboard_type == DashboardType.LIFE:
            return LifeRenderer(session=session, user_id=user_id)
        if dashboard_type == DashboardType.WEATHER:
            return WeatherRenderer(session=session, user_id=user_id)
        return GithubRenderer(session=session, user_id=user_id)
    assert_never(dashboard_type)
