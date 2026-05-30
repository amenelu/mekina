"""Add buyer intent, dealer pipeline, and SLA fields

Revision ID: e6f7a8b9c0d1
Revises: d4e5f6a7b8c9
Create Date: 2026-05-31 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e6f7a8b9c0d1"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "response_sla_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "response_sla_minutes",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("1440"),
            )
        )

    op.create_table(
        "request_intent_verifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("contact_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("budget_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("financing_ready", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("trade_in_ready", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("purchase_timeline", sa.String(length=40), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("level", sa.String(length=20), nullable=False, server_default="basic"),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["request_id"], ["car_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index(
        "ix_request_intent_verifications_level",
        "request_intent_verifications",
        ["level"],
        unique=False,
    )

    op.create_table(
        "dealer_lead_pipeline",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dealer_bid_id", sa.Integer(), nullable=False),
        sa.Column("dealer_id", sa.Integer(), nullable=False),
        sa.Column("buyer_id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.Integer(), nullable=False),
        sa.Column("stage", sa.String(length=40), nullable=False, server_default="offer_sent"),
        sa.Column("buyer_viewed_at", sa.DateTime(), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("next_follow_up_at", sa.DateTime(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["buyer_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["dealer_bid_id"], ["dealer_bid.id"]),
        sa.ForeignKeyConstraint(["dealer_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["car_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dealer_bid_id"),
    )
    op.create_index(
        "ix_dealer_lead_pipeline_dealer_stage",
        "dealer_lead_pipeline",
        ["dealer_id", "stage"],
        unique=False,
    )
    op.create_index(
        "ix_dealer_lead_pipeline_follow_up",
        "dealer_lead_pipeline",
        ["dealer_id", "next_follow_up_at"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_dealer_lead_pipeline_follow_up", table_name="dealer_lead_pipeline")
    op.drop_index("ix_dealer_lead_pipeline_dealer_stage", table_name="dealer_lead_pipeline")
    op.drop_table("dealer_lead_pipeline")
    op.drop_index(
        "ix_request_intent_verifications_level",
        table_name="request_intent_verifications",
    )
    op.drop_table("request_intent_verifications")
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("response_sla_minutes")
        batch_op.drop_column("response_sla_enabled")

