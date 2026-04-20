"""Finalize sector normalization for designations.

Revision ID: 0b307673f879
Revises: ecd546098a75
Create Date: 2026-04-20 17:22:24.889623

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0b307673f879"
down_revision: Union[str, Sequence[str], None] = "ecd546098a75"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("designations") as batch_op:
        batch_op.create_foreign_key(
            "fk_designations_sector_id_sectors",
            "sectors",
            ["sector_id"],
            ["id"],
        )
        batch_op.drop_column("sector")


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("designations") as batch_op:
        batch_op.add_column(sa.Column("sector", sa.String(length=50), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE designations
            SET sector = (
                SELECT sectors.sector
                FROM sectors
                WHERE sectors.id = designations.sector_id
            )
            """
        )
    )

    with op.batch_alter_table("designations") as batch_op:
        batch_op.alter_column(
            "sector", existing_type=sa.String(length=50), nullable=False
        )
        batch_op.drop_constraint(
            "fk_designations_sector_id_sectors", type_="foreignkey"
        )
        batch_op.drop_column("sector_id")
