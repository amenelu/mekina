"""Add dealer offer boosts and request unlocks

Revision ID: f2a9c4d8e1b7
Revises: e6f7a8b9c0d1
Create Date: 2026-05-31 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f2a9c4d8e1b7"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("dealer_bid", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_boosted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
        batch_op.add_column(sa.Column("boosted_until", sa.DateTime(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "boost_points_spent",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )

    op.create_table(
        "dealer_request_unlocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dealer_id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column(
            "unlock_type",
            sa.String(length=40),
            nullable=False,
            server_default="high_intent",
        ),
        sa.Column(
            "points_spent",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["dealer_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["car_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "dealer_id",
            "request_id",
            "unlock_type",
            name="uq_dealer_request_unlock_once",
        ),
    )
    op.create_index(
        "ix_dealer_request_unlock_dealer_request",
        "dealer_request_unlocks",
        ["dealer_id", "request_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_dealer_request_unlock_dealer_request",
        table_name="dealer_request_unlocks",
    )
    op.drop_table("dealer_request_unlocks")
    with op.batch_alter_table("dealer_bid", schema=None) as batch_op:
        batch_op.drop_column("boost_points_spent")
        batch_op.drop_column("boosted_until")
        batch_op.drop_column("is_boosted")
