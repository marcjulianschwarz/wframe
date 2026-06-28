"""add display geometry to epapers

Revision ID: c3d4e5f6a7b8
Revises: c3e4f5a6b7c8
Create Date: 2026-06-27 22:10:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'c3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('epapers', sa.Column('screen_width', sa.Integer(), nullable=False, server_default='480'))
    op.add_column('epapers', sa.Column('screen_height', sa.Integer(), nullable=False, server_default='800'))
    op.add_column('epapers', sa.Column('image_width', sa.Integer(), nullable=False, server_default='480'))
    op.add_column('epapers', sa.Column('image_height', sa.Integer(), nullable=False, server_default='800'))
    op.add_column('epapers', sa.Column('image_x', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('epapers', sa.Column('image_y', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('epapers', 'image_y')
    op.drop_column('epapers', 'image_x')
    op.drop_column('epapers', 'image_height')
    op.drop_column('epapers', 'image_width')
    op.drop_column('epapers', 'screen_height')
    op.drop_column('epapers', 'screen_width')
