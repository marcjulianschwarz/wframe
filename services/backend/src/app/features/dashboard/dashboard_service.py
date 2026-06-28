import re
import uuid

from fastapi import HTTPException, status

from app.features.dashboard.dashboard_adapter import (
    catalog_entry_to_store_item,
    dashboard_model_to_read,
)
from app.features.dashboard.dashboard_models import (
    DASHBOARD_CATALOG,
    Dashboard,
    DashboardSource,
    DashboardType,
)
from app.features.dashboard.dashboard_repository import DashboardRepoProtocol
from app.features.dashboard.dashboard_schemas import (
    CustomDashboardCreate,
    DashboardRead,
    DashboardUpdate,
    StoreItem,
)

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    """Lowercase kebab slug; collapses runs of non-alphanumerics to a hyphen."""
    return _SLUG_RE.sub("-", value.lower()).strip("-")


def _normalize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="custom_url must start with http:// or https://",
        )
    return url


class DashboardService:
    def __init__(self, repo: DashboardRepoProtocol) -> None:
        self.repo: DashboardRepoProtocol = repo

    # --- store (static catalog) ------------------------------------------- #
    def list_store(self) -> list[StoreItem]:
        return [catalog_entry_to_store_item(t, v) for t, v in DASHBOARD_CATALOG.items()]

    def get_store_item(self, dashboard_type: DashboardType) -> StoreItem:
        entry = DASHBOARD_CATALOG.get(dashboard_type)
        if entry is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown dashboard")
        return catalog_entry_to_store_item(dashboard_type, entry)

    # --- collection ------------------------------------------------------- #
    async def list_collection(self, user_id: uuid.UUID, source: DashboardSource | None = None) -> list[DashboardRead]:
        rows = await self.repo.list_for_user(user_id, source)
        return [dashboard_model_to_read(d) for d in rows]

    async def _unique_slug(self, user_id: uuid.UUID, base: str, exclude_id: uuid.UUID | None = None) -> str:
        """A per-user-unique slug derived from ``base`` (appending -2, -3, …)."""
        base = slugify(base) or "dashboard"
        candidate = base
        n = 2
        while await self.repo.slug_exists(user_id, candidate, exclude_id):
            candidate = f"{base}-{n}"
            n += 1
        return candidate

    async def add_from_store(self, user_id: uuid.UUID, dashboard_type: DashboardType) -> DashboardRead:
        item = self.get_store_item(dashboard_type)
        slug = await self._unique_slug(user_id, item.title)
        dashboard = Dashboard(
            user_id=user_id,
            source=DashboardSource.STORE.value,
            type=dashboard_type.value,
            custom_url=None,
            name=item.title,
            description=item.description,
            slug=slug,
        )
        dashboard = await self.repo.add(dashboard)
        return dashboard_model_to_read(dashboard)

    async def create_custom(self, user_id: uuid.UUID, body: CustomDashboardCreate) -> DashboardRead:
        url = _normalize_url(body.custom_url)
        slug_base = body.slug if body.slug else body.name
        slug = await self._resolve_slug(user_id, slug_base)
        dashboard = Dashboard(
            user_id=user_id,
            source=DashboardSource.CUSTOM.value,
            type=None,
            custom_url=url,
            name=body.name.strip(),
            description=(body.description.strip() if body.description else None),
            slug=slug,
        )
        dashboard = await self.repo.add(dashboard)
        return dashboard_model_to_read(dashboard)

    async def _resolve_slug(self, user_id: uuid.UUID, requested: str, exclude_id: uuid.UUID | None = None) -> str:
        """Validate a user-supplied slug, or auto-generate a unique one.

        An explicit slug must be valid and free; auto-generated ones are
        de-duplicated silently. A taken explicit slug is a 409 so the user knows.
        """
        normalized = slugify(requested)
        if not normalized:
            return await self._unique_slug(user_id, "dashboard", exclude_id)
        if await self.repo.slug_exists(user_id, normalized, exclude_id):
            # Only raise when the user explicitly asked for this exact slug.
            if slugify(requested) == normalized and requested.strip():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"You already have a dashboard with the slug '{normalized}'",
                )
        return normalized

    async def update(self, user_id: uuid.UUID, dashboard_id: uuid.UUID, body: DashboardUpdate) -> DashboardRead:
        dashboard = await self._owned(user_id, dashboard_id)
        if body.name is not None:
            dashboard.name = body.name.strip()
        if body.description is not None:
            dashboard.description = body.description.strip() or None
        if body.slug is not None:
            dashboard.slug = await self._resolve_slug(user_id, body.slug, exclude_id=dashboard.id)
        if body.custom_url is not None:
            if dashboard.source != DashboardSource.CUSTOM.value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only custom dashboards have a URL",
                )
            dashboard.custom_url = _normalize_url(body.custom_url)
        dashboard = await self.repo.save(dashboard)
        return dashboard_model_to_read(dashboard)

    async def delete(self, user_id: uuid.UUID, dashboard_id: uuid.UUID) -> None:
        dashboard = await self._owned(user_id, dashboard_id)
        await self.repo.delete(dashboard)

    async def _owned(self, user_id: uuid.UUID, dashboard_id: uuid.UUID) -> Dashboard:
        dashboard = await self.repo.get(user_id, dashboard_id)
        if dashboard is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")
        return dashboard

    async def get_owned(self, user_id: uuid.UUID, dashboard_id: uuid.UUID) -> Dashboard:
        return await self._owned(user_id, dashboard_id)
