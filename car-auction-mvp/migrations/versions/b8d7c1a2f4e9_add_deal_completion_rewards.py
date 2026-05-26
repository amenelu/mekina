"""Add deal completion rewards

Revision ID: b8d7c1a2f4e9
Revises: a6c2f4e8d901
Create Date: 2026-05-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b8d7c1a2f4e9"
down_revision = "a6c2f4e8d901"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("deal", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("status", sa.String(length=20), nullable=True)
        )
        batch_op.add_column(sa.Column("completed_at", sa.DateTime(), nullable=True))
        batch_op.add_column(
            sa.Column("reward_points_awarded", sa.Boolean(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("reward_points_amount", sa.Integer(), nullable=True)
        )

    op.execute("UPDATE deal SET status = 'accepted' WHERE status IS NULL")
    op.execute(
        "UPDATE deal SET reward_points_awarded = 0 "
        "WHERE reward_points_awarded IS NULL"
    )
    op.execute(
        "UPDATE deal SET reward_points_amount = 0 "
        "WHERE reward_points_amount IS NULL"
    )

    with op.batch_alter_table("deal", schema=None) as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=20),
            nullable=False,
        )
        batch_op.alter_column(
            "reward_points_awarded",
            existing_type=sa.Boolean(),
            nullable=False,
        )
        batch_op.alter_column(
            "reward_points_amount",
            existing_type=sa.Integer(),
            nullable=False,
        )


def downgrade():
    with op.batch_alter_table("deal", schema=None) as batch_op:
        batch_op.drop_column("reward_points_amount")
        batch_op.drop_column("reward_points_awarded")
        batch_op.drop_column("completed_at")
        batch_op.drop_column("status")
