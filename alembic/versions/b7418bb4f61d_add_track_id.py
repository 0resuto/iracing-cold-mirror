"""add track_id

Revision ID: b7418bb4f61d
Revises: 62347447d1b6
Create Date: 2026-08-07 12:08:14.978848

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7418bb4f61d"
down_revision: Union[str, Sequence[str], None] = "62347447d1b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("sessions", sa.Column("track_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_sessions_track_id"), "sessions", ["track_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_sessions_track_id"), table_name="sessions")
    op.drop_column("sessions", "track_id")
