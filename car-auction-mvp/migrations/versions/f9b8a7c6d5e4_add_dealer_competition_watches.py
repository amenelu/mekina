"""Add dealer competition watches

Revision ID: f9b8a7c6d5e4
Revises: f2a9c4d8e1b7
Create Date: 2026-06-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f9b8a7c6d5e4"
down_revision = "f2a9c4d8e1b7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "dealer_request_watches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dealer_id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column(
            "points_spent",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["dealer_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["car_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "dealer_id",
            "request_id",
            name="uq_dealer_request_watch_once",
        ),
    )
    op.create_index(
        "ix_dealer_request_watch_request_active",
        "dealer_request_watches",
        ["request_id", "is_active"],
        unique=False,
    )
    op.create_index(
        "ix_dealer_request_watch_dealer",
        "dealer_request_watches",
        ["dealer_id"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_dealer_request_watch_dealer", table_name="dealer_request_watches")
    op.drop_index(
        "ix_dealer_request_watch_request_active",
        table_name="dealer_request_watches",
    )
    op.drop_table("dealer_request_watches")
