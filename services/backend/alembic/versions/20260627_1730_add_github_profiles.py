"""add github_profiles

Revision ID: c3e4f5a6b7c8
Revises: dd1dda74bb29
Create Date: 2026-06-27 17:30:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3e4f5a6b7c8'
down_revision: Union[str, None] = 'dd1dda74bb29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('github_profiles',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('username', sa.String(length=39), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id')
    )


def downgrade() -> None:
    op.drop_table('github_profiles')
