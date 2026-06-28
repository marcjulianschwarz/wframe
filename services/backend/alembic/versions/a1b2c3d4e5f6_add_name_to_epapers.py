"""add name to epapers

Revision ID: a1b2c3d4e5f6
Revises: 6509a40e6c11
Create Date: 2026-06-28 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '6509a40e6c11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default backfills existing epapers with a friendly label; the app
    # always writes an explicit name, so the default only matters for this backfill.
    op.add_column(
        'epapers',
        sa.Column('name', sa.String(length=80), nullable=False, server_default='My epaper'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('epapers', 'name')
