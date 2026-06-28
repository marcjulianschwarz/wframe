"""add image_uploads

Revision ID: c1d2e3f4a5b6
Revises: b95cfc578ce1
Create Date: 2026-06-28 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b95cfc578ce1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('image_uploads',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('data', sa.LargeBinary(), nullable=False),
    sa.Column('content_type', sa.String(length=64), nullable=False),
    sa.Column('algorithm', sa.String(length=24), nullable=False),
    sa.Column('fit', sa.String(length=16), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('image_uploads')
