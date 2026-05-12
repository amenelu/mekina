"""Add dealer point requests table

Revision ID: 8c2d6b2e4f21
Revises: 5a8a1f2f9c40
Create Date: 2026-05-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "8c2d6b2e4f21"
down_revision = "5a8a1f2f9c40"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "dealer_point_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dealer_id", sa.Integer(), nullable=False),
        sa.Column("requested_points", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["dealer_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_dealer_point_requests_status"),
        "dealer_point_requests",
        ["status"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        op.f("ix_dealer_point_requests_status"),
        table_name="dealer_point_requests",
    )
    op.drop_table("dealer_point_requests")
