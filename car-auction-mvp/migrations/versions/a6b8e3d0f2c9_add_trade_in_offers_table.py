"""Add trade-in offers table

Revision ID: a6b8e3d0f2c9
Revises: 9f4d2c1b7a6e
Create Date: 2026-05-19 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a6b8e3d0f2c9"
down_revision = "9f4d2c1b7a6e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "trade_in_offers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trade_in_request_id", sa.Integer(), nullable=False),
        sa.Column("dealer_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["dealer_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["trade_in_request_id"], ["trade_in_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("trade_in_offers")
