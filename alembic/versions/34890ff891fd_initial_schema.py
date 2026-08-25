"""initial_schema

Revision ID: 34890ff891fd
Revises:
Create Date: 2026-08-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34890ff891fd'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'players',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(), unique=True, index=True),
    )

    op.create_table(
        'sessions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('file_hash', sa.String(), unique=True, index=True, nullable=True),
        sa.Column('player_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False, index=True),
        sa.Column('track_name', sa.String(), nullable=False),
        sa.Column('track_id', sa.Integer(), nullable=True, index=True),
        sa.Column('car_name', sa.String(), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True, server_default='0'),
        sa.Column('redline_rpm', sa.Integer(), nullable=True, server_default='8500'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'laps',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('sessions.id'), nullable=False, index=True),
        sa.Column('lap_number', sa.Integer(), nullable=False),
        sa.Column('lap_time', sa.Float(), default=0.0, index=True),
    )

    op.create_table(
        'sectors',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lap_id', sa.Integer(), sa.ForeignKey('laps.id'), nullable=False, index=True),
        sa.Column('sector_number', sa.Integer(), nullable=False),
        sa.Column('sector_time', sa.Float(), nullable=False),
    )

    op.create_table(
        'telemetry',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lap_id', sa.Integer(), sa.ForeignKey('laps.id'), nullable=False, index=True),
        sa.Column('session_time', sa.Float(), nullable=False, index=True),
        sa.Column('speed', sa.Float(), nullable=False),
        sa.Column('rpm', sa.Integer(), nullable=False),
        sa.Column('gear', sa.Integer(), nullable=False),
        sa.Column('throttle', sa.Float(), nullable=False),
        sa.Column('brake', sa.Float(), nullable=False),
        sa.Column('wheel_angle', sa.Float(), nullable=False),
        sa.Column('lap_dist_pct', sa.Float(), nullable=False),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lon', sa.Float(), nullable=True),
        sa.Column('lat_accel', sa.Float(), nullable=True),
        sa.Column('long_accel', sa.Float(), nullable=True),
        sa.Column('yaw_rate', sa.Float(), nullable=True),
        sa.Column('velocity_x', sa.Float(), nullable=True),
        sa.Column('velocity_z', sa.Float(), nullable=True),
        sa.Column('slip_angle', sa.Float(), nullable=True),
        sa.Column('lf_speed', sa.Float(), nullable=True),
        sa.Column('rf_speed', sa.Float(), nullable=True),
        sa.Column('lr_speed', sa.Float(), nullable=True),
        sa.Column('rr_speed', sa.Float(), nullable=True),
        sa.Column('abs_active', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('tc_active', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('wheel_lock', sa.Boolean(), nullable=True, server_default='false'),
    )


def downgrade() -> None:
    op.drop_table('telemetry')
    op.drop_table('sectors')
    op.drop_table('laps')
    op.drop_table('sessions')
    op.drop_table('players')
