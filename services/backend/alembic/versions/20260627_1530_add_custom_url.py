"""add custom_url to epapers

Revision ID: a1f2c3d4e5b6
Revises: 93ae96650c94
Create Date: 2026-06-27 15:30:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1f2c3d4e5b6'
down_revision: Union[str, None] = '93ae96650c94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'epapers',
        sa.Column('custom_url', sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('epapers', 'custom_url')
