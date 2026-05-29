"""Add marketplace intelligence indexes

Revision ID: d4e5f6a7b8c9
Revises: c9d1e2f3a4b5
Create Date: 2026-05-30 00:00:00.000000

"""
from alembic import op


revision = "d4e5f6a7b8c9"
down_revision = "c9d1e2f3a4b5"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_car_requests_status_created_at",
        "car_requests",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_dealer_bid_request_status_valid_until",
        "dealer_bid",
        ["request_id", "status", "valid_until"],
        unique=False,
    )
    op.create_index(
        "ix_dealer_bid_dealer_timestamp",
        "dealer_bid",
        ["dealer_id", "timestamp"],
        unique=False,
    )
    op.create_index(
        "ix_chat_messages_contact_risk",
        "chat_messages",
        ["has_contact_risk"],
        unique=False,
    )
    op.create_index(
        "ix_point_transactions_user_created_at",
        "point_transactions",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_point_transactions_user_created_at", table_name="point_transactions")
    op.drop_index("ix_chat_messages_contact_risk", table_name="chat_messages")
    op.drop_index("ix_dealer_bid_dealer_timestamp", table_name="dealer_bid")
    op.drop_index("ix_dealer_bid_request_status_valid_until", table_name="dealer_bid")
    op.drop_index("ix_car_requests_status_created_at", table_name="car_requests")
