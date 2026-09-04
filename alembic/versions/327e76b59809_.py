"""Add presence confirmation fields to designations.

Revision ID: 327e76b59809
Revises: 0b307673f879
Create Date: 2026-09-04 17:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "327e76b59809"
down_revision: Union[str, Sequence[str], None] = "0b307673f879"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("designations") as batch_op:
        batch_op.add_column(
            sa.Column(
                "confirmed_present",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.add_column(
            sa.Column(
                "substituted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.alter_column("sector_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("designations") as batch_op:
        batch_op.alter_column("sector_id", existing_type=sa.Integer(), nullable=False)
        batch_op.drop_column("substituted")
        batch_op.drop_column("confirmed_present")
