"""change_telemetry_flags_to_boolean

Revision ID: 135abc433161
Revises: b7418bb4f61d
Create Date: 2026-08-25 12:50:58.494058

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "135abc433161"
down_revision: Union[str, Sequence[str], None] = "b7418bb4f61d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE telemetry ALTER COLUMN abs_active TYPE BOOLEAN USING (abs_active > 0)")
    op.execute("ALTER TABLE telemetry ALTER COLUMN tc_active TYPE BOOLEAN USING (tc_active > 0)")
    op.execute("ALTER TABLE telemetry ALTER COLUMN wheel_lock TYPE BOOLEAN USING (wheel_lock > 0)")


def downgrade() -> None:
    op.execute(
        "ALTER TABLE telemetry ALTER COLUMN abs_active TYPE FLOAT USING (CASE WHEN abs_active THEN 1.0 ELSE 0.0 END)"
    )
    op.execute(
        "ALTER TABLE telemetry ALTER COLUMN tc_active TYPE FLOAT USING (CASE WHEN tc_active THEN 1.0 ELSE 0.0 END)"
    )
    op.execute(
        "ALTER TABLE telemetry ALTER COLUMN wheel_lock TYPE FLOAT USING (CASE WHEN wheel_lock THEN 1.0 ELSE 0.0 END)"
    )
