"""add refresh control (paused, refresh_interval) to epapers

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-27 23:10:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('epapers', sa.Column('paused', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('epapers', sa.Column('refresh_interval', sa.Integer(), nullable=False, server_default='300'))


def downgrade() -> None:
    op.drop_column('epapers', 'refresh_interval')
    op.drop_column('epapers', 'paused')
