"""add deal completion request state

Revision ID: c3f8a1d4e9b2
Revises: b8d7c1a2f4e9
Create Date: 2026-05-26 18:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c3f8a1d4e9b2"
down_revision = "b8d7c1a2f4e9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("deal", schema=None) as batch_op:
        batch_op.add_column(sa.Column("completion_requested_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("completion_requested_by_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_deal_completion_requested_by_id_user",
            "user",
            ["completion_requested_by_id"],
            ["id"],
        )


def downgrade():
    with op.batch_alter_table("deal", schema=None) as batch_op:
        batch_op.drop_constraint("fk_deal_completion_requested_by_id_user", type_="foreignkey")
        batch_op.drop_column("completion_requested_by_id")
        batch_op.drop_column("completion_requested_at")
