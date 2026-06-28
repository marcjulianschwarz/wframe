"""initial schema

Revision ID: 93ae96650c94
Revises:
Create Date: 2026-06-27 12:42:19.187850+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '93ae96650c94'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('username', sa.String(length=64), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('username')
    )
    # The user's collection of dashboards (store-added and custom).
    op.create_table('dashboards',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('source', sa.String(length=16), nullable=False),
    sa.Column('type', sa.String(length=32), nullable=True),
    sa.Column('custom_url', sa.String(length=2048), nullable=True),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('slug', sa.String(length=80), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'slug', name='uq_dashboards_user_slug')
    )
    op.create_index(op.f('ix_dashboards_user_id'), 'dashboards', ['user_id'], unique=False)
    # Cached native renders, keyed per collection dashboard.
    op.create_table('bitmaps',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('dashboard_id', sa.UUID(), nullable=False),
    sa.Column('data', sa.LargeBinary(), nullable=False),
    sa.Column('rendered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['dashboard_id'], ['dashboards.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bitmaps_dashboard_id'), 'bitmaps', ['dashboard_id'], unique=False)
    # Registered epaper devices. A user may have several; each displays one
    # collection dashboard and carries its own geometry/refresh settings.
    op.create_table('epapers',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('slug', sa.String(length=64), nullable=False),
    sa.Column('dashboard_id', sa.UUID(), nullable=True),
    sa.Column('screen_width', sa.Integer(), nullable=False, server_default='480'),
    sa.Column('screen_height', sa.Integer(), nullable=False, server_default='800'),
    sa.Column('image_width', sa.Integer(), nullable=False, server_default='480'),
    sa.Column('image_height', sa.Integer(), nullable=False, server_default='800'),
    sa.Column('image_x', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('image_y', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('rotation', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('paused', sa.Boolean(), nullable=False, server_default=sa.false()),
    sa.Column('refresh_interval', sa.Integer(), nullable=False, server_default='300'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['dashboard_id'], ['dashboards.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_epapers_user_id'), 'epapers', ['user_id'], unique=False)
    op.create_table('weather_locations',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('latitude', sa.Float(), nullable=False),
    sa.Column('longitude', sa.Float(), nullable=False),
    sa.Column('place', sa.String(length=120), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_table('github_profiles',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('username', sa.String(length=39), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_table('life_states',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('grid', sa.LargeBinary(), nullable=False),
    sa.Column('generation', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id')
    )


def downgrade() -> None:
    op.drop_table('life_states')
    op.drop_table('github_profiles')
    op.drop_table('weather_locations')
    op.drop_index(op.f('ix_epapers_user_id'), table_name='epapers')
    op.drop_table('epapers')
    op.drop_index(op.f('ix_bitmaps_dashboard_id'), table_name='bitmaps')
    op.drop_table('bitmaps')
    op.drop_index(op.f('ix_dashboards_user_id'), table_name='dashboards')
    op.drop_table('dashboards')
    op.drop_table('users')
