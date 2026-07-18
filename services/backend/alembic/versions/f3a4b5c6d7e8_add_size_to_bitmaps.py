"""add width/height to bitmaps

Bitmaps are now rendered at the epaper's image size (the HTML reflows for it),
so a cached render is only valid for the size it was produced at. Add
width/height and key the cache by them. Existing rows were native 480x800
renders, so backfill with those defaults.

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-07-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a4b5c6d7e8'
down_revision: Union[str, Sequence[str], None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bitmaps', sa.Column('width', sa.Integer(), nullable=False, server_default='480'))
    op.add_column('bitmaps', sa.Column('height', sa.Integer(), nullable=False, server_default='800'))
    # Drop the server defaults: the ORM always supplies these on insert now.
    op.alter_column('bitmaps', 'width', server_default=None)
    op.alter_column('bitmaps', 'height', server_default=None)
    op.create_index('ix_bitmaps_dashboard_size', 'bitmaps', ['dashboard_id', 'width', 'height'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_bitmaps_dashboard_size', table_name='bitmaps')
    op.drop_column('bitmaps', 'height')
    op.drop_column('bitmaps', 'width')
