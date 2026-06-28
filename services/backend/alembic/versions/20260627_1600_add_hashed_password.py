"""add hashed_password to users

Revision ID: b2c3d4e5f6a7
Revises: a1f2c3d4e5b6
Create Date: 2026-06-27 16:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1f2c3d4e5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nullable first so any existing rows survive, backfill an unusable
    # hash (no plaintext can produce it), then enforce NOT NULL.
    op.add_column(
        'users',
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
    )
    op.execute(
        "UPDATE users SET hashed_password = '!' WHERE hashed_password IS NULL"
    )
    op.alter_column('users', 'hashed_password', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'hashed_password')
